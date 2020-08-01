import { captureException, captureMessage } from '@sentry/react-native';
import { toChecksumAddress } from 'ethereumjs-util';
import { filter, flatMap, get, keys, map, values } from 'lodash';
import {
  getWalletNames,
  saveWalletNames,
} from '../handlers/localstorage/walletNames';
import { web3Provider } from '../handlers/web3';
import WalletTypes from '../helpers/walletTypes';
import { hasKey } from '../model/keychain';
import {
  addressKey,
  generateAccount,
  getAllWallets,
  getSelectedWallet,
  loadAddress,
  saveAddress,
  saveAllWallets,
  seedPhraseKey,
  seedPhraseMigratedKey,
  setSelectedWallet,
} from '../model/wallet';
import { settingsUpdateAccountAddress } from '../redux/settings';
import { logger } from '../utils';

// -- Constants --------------------------------------- //
const WALLETS_ADDED_ACCOUNT = 'wallets/WALLETS_ADDED_ACCOUNT';
const WALLETS_LOAD = 'wallets/ALL_WALLETS_LOAD';
const WALLETS_UPDATE = 'wallets/ALL_WALLETS_UPDATE';
const WALLETS_UPDATE_NAMES = 'wallets/WALLETS_UPDATE_NAMES';
const WALLETS_SET_IS_CREATING_ACCOUNT = 'wallets/SET_IS_CREATING_ACCOUNT';
const WALLETS_SET_SELECTED = 'wallets/SET_SELECTED';

// -- Actions ---------------------------------------- //
export const walletsLoadState = () => async (dispatch, getState) => {
  try {
    const { accountAddress } = getState().settings;
    let addressFromKeychain = accountAddress;
    const { wallets } = await getAllWallets();
    const selected = await getSelectedWallet();
    // Prevent irrecoverable state (no selected wallet)
    let selectedWallet = get(selected, 'wallet', undefined);
    if (!selectedWallet) {
      const address = await loadAddress();
      keys(wallets).some(key => {
        const someWallet = wallets[key];
        const found = someWallet.addresses.some(account => {
          return (
            toChecksumAddress(account.address) === toChecksumAddress(address)
          );
        });
        if (found) {
          selectedWallet = someWallet;
          logger.sentry('Found selected wallet based on loadAddress result');
        }
        return found;
      });
    }

    // Recover from broken state (account address not in selected wallet)
    if (!addressFromKeychain) {
      addressFromKeychain = await loadAddress();
      logger.sentry(
        'addressFromKeychain wasnt set on settings so it is being loaded from loadAddress'
      );
    }

    const selectedAddress = selectedWallet.addresses.find(a => {
      return a.visible && a.address === addressFromKeychain;
    });

    if (!selectedAddress) {
      const account = selectedWallet.addresses.find(a => a.visible);
      await dispatch(settingsUpdateAccountAddress(account.address));
      await saveAddress(account.address);
      logger.sentry(
        'Selected the first visible address because there was not selected one'
      );
    }

    const walletNames = await getWalletNames();

    dispatch({
      payload: {
        selected: selectedWallet,
        walletNames,
        wallets,
      },
      type: WALLETS_LOAD,
    });

    dispatch(fetchWalletNames());
  } catch (error) {
    logger.sentry('Exception during walletsLoadState');
    captureException(error);
  }
};

export const walletsUpdate = wallets => dispatch => {
  saveAllWallets(wallets);
  dispatch({
    payload: wallets,
    type: WALLETS_UPDATE,
  });
};

export const walletsSetSelected = wallet => async dispatch => {
  await setSelectedWallet(wallet);
  dispatch({
    payload: wallet,
    type: WALLETS_SET_SELECTED,
  });
};

export const isCreatingAccount = val => dispatch => {
  dispatch({
    payload: val,
    type: WALLETS_SET_IS_CREATING_ACCOUNT,
  });
};

export const addressSetSelected = address => () => saveAddress(address);

export const createAccountForWallet = (id, color, name) => async (
  dispatch,
  getState
) => {
  const { wallets } = getState().wallets;
  const newWallets = { ...wallets };
  let index = 0;
  newWallets[id].addresses.forEach(
    account => (index = Math.max(index, account.index))
  );
  const newIndex = index + 1;
  const account = await generateAccount(id, newIndex);
  newWallets[id].addresses.push({
    address: account.address,
    avatar: null,
    color,
    index: newIndex,
    label: name,
    visible: true,
  });

  // Save all the wallets
  saveAllWallets(newWallets);
  // Set the address selected (KEYCHAIN)
  await saveAddress(account.address);
  // Set the wallet selected (KEYCHAIN)
  await setSelectedWallet(newWallets[id]);

  dispatch({
    payload: { selected: newWallets[id], wallets: newWallets },
    type: WALLETS_ADDED_ACCOUNT,
  });
};

export const fetchWalletNames = () => async (dispatch, getState) => {
  const { wallets } = getState().wallets;
  const updatedWalletNames = {};

  // Fetch ENS names
  await Promise.all(
    flatMap(values(wallets), wallet => {
      const visibleAccounts = filter(wallet.addresses, 'visible');
      return map(visibleAccounts, async account => {
        try {
          const ens = await web3Provider.lookupAddress(account.address);
          if (ens && ens !== account.address) {
            updatedWalletNames[account.address] = ens;
          }
          // eslint-disable-next-line no-empty
        } catch (error) {}
        return account;
      });
    })
  );

  dispatch({
    payload: updatedWalletNames,
    type: WALLETS_UPDATE_NAMES,
  });
  saveWalletNames(updatedWalletNames);
};

export const checkKeychainIntegrity = () => async (dispatch, getState) => {
  try {
    let healthyKeychain = true;
    logger.sentry('[KeychainIntegrityCheck]: starting checks');

    const hasAddress = await hasKey(addressKey);
    if (hasAddress) {
      logger.sentry('[KeychainIntegrityCheck]: address is ok');
    } else {
      healthyKeychain = false;
      logger.sentry(
        `[KeychainIntegrityCheck]: address is missing: ${hasAddress}`
      );
    }

    const hasMigratedFlag = await hasKey(seedPhraseMigratedKey);
    if (hasMigratedFlag) {
      logger.sentry('[KeychainIntegrityCheck]: migrated flag is OK');
    } else {
      logger.sentry(
        `[KeychainIntegrityCheck]: migrated flag is missing: ${hasMigratedFlag}`
      );
    }

    const hasOldSeedphraseKey = await hasKey(seedPhraseKey);
    if (hasOldSeedphraseKey) {
      logger.sentry('[KeychainIntegrityCheck]: old seed is still present!');
    } else {
      logger.sentry(
        `[KeychainIntegrityCheck]: old seed is not present: ${hasOldSeedphraseKey}`
      );
    }

    const { wallets, selected } = getState().wallets;
    if (!wallets) {
      logger.sentry(
        '[KeychainIntegrityCheck]: wallets are missing from redux',
        wallets
      );
    }

    if (!selected) {
      logger.sentry(
        '[KeychainIntegrityCheck]: selectedwallet is missing from redux',
        selected
      );
    }

    const nonReadOnlyWalletKeys = keys(wallets).filter(
      key => wallets[key].type !== WalletTypes.readOnly
    );

    for (const key of nonReadOnlyWalletKeys) {
      let healthyWallet = true;
      logger.sentry(`[KeychainIntegrityCheck]: checking wallet ${key}`);
      const wallet = wallets[key];
      logger.sentry(`[KeychainIntegrityCheck]: Wallet data`, wallet);
      const seedKeyFound = await hasKey(`${key}_rainbowSeedPhrase`);
      if (!seedKeyFound) {
        healthyWallet = false;
        logger.sentry('[KeychainIntegrityCheck]: seed key is missing');
      } else {
        logger.sentry('[KeychainIntegrityCheck]: seed key is present');
      }

      for (const account of wallet.addresses) {
        const pkeyFound = await hasKey(`${account.address}_rainbowPrivateKey`);
        if (!pkeyFound) {
          healthyWallet = false;
          logger.sentry(
            `[KeychainIntegrityCheck]: pkey is missing for address: ${account.address}`
          );
        } else {
          logger.sentry(
            `[KeychainIntegrityCheck]: pkey is present for address: ${account.address}`
          );
        }
      }

      if (!healthyWallet) {
        logger.sentry(
          '[KeychainIntegrityCheck]: declaring wallet unhealthy...'
        );
        healthyKeychain = false;
        wallet.damaged = true;
        await dispatch(walletsUpdate(wallets));
        // Update selected wallet if needed
        if (wallet.id === selected.id) {
          logger.sentry(
            '[KeychainIntegrityCheck]: declaring selected wallet unhealthy...'
          );
          await dispatch(walletsSetSelected(wallets[wallet.id]));
        }
        logger.sentry('[KeychainIntegrityCheck]: done updating wallets');
      }
    }
    if (!healthyKeychain) {
      captureMessage('Keychain Integrity is not OK');
    }
    logger.sentry('[KeychainIntegrityCheck]: check completed');
  } catch (e) {
    logger.sentry('[KeychainIntegrityCheck]: error thrown', e);
    captureMessage('Error running keychain integrity checks');
  }
};

// -- Reducer ----------------------------------------- //
const INITIAL_STATE = {
  isCreatingAccount: false,
  selected: undefined,
  walletNames: {},
  wallets: null,
};

export default (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case WALLETS_SET_IS_CREATING_ACCOUNT:
      return { ...state, isCreatingAccount: action.payload };
    case WALLETS_SET_SELECTED:
      return { ...state, selected: action.payload };
    case WALLETS_UPDATE:
      return { ...state, wallets: action.payload };
    case WALLETS_UPDATE_NAMES:
      return { ...state, walletNames: action.payload };
    case WALLETS_LOAD:
      return {
        ...state,
        selected: action.payload.selected,
        walletNames: action.payload.walletNames,
        wallets: action.payload.wallets,
      };
    case WALLETS_ADDED_ACCOUNT:
      return {
        ...state,
        selected: action.payload.selected,
        wallets: action.payload.wallets,
      };
    default:
      return state;
  }
};
