import { withSafeTimeout } from '@hocs/safe-timers';
import analytics from '@segment/analytics-react-native';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Animated from 'react-native-reanimated';
import { withNavigation, withNavigationFocus } from 'react-navigation';
import {
  compose,
  withHandlers,
  withProps,
  withState,
} from 'recompact';
import { FadeInAnimation } from '../components/animations';
import { AssetList } from '../components/asset-list';
import BlurOverlay from '../components/BlurOverlay';
import { FabWrapper } from '../components/fab';
import {
  CameraHeaderButton,
  Header,
  ProfileHeaderButton,
} from '../components/header';
import { Page } from '../components/layout';
import buildWalletSectionsSelector from '../helpers/buildWalletSections';
import {
  getShowShitcoinsSetting,
  updateShowShitcoinsSetting,
} from '../handlers/commonStorage';
import {
  withAccountData,
  withAccountSettings,
  withBlurTransitionProps,
  withDataInit,
  withIsWalletEmpty,
  withUniqueTokens,
  withStatusBarStyle,
  withUniswapLiquidity,
} from '../hoc';
import { colors, position } from '../styles';
import { deviceUtils, isNewValueForPath } from '../utils';

class WalletScreen extends Component {
  static propTypes = {
    allAssetsCount: PropTypes.number,
    assets: PropTypes.array,
    assetsTotal: PropTypes.object,
    blurOpacity: PropTypes.object,
    initializeWallet: PropTypes.func,
    isFocused: PropTypes.bool,
    isWalletEmpty: PropTypes.bool.isRequired,
    isWalletEthZero: PropTypes.bool.isRequired,
    navigation: PropTypes.object,
    refreshAccountData: PropTypes.func,
    scrollViewTracker: PropTypes.object,
    sections: PropTypes.array,
    setSafeTimeout: PropTypes.func,
    showBlur: PropTypes.bool,
    toggleShowShitcoins: PropTypes.func,
    uniqueTokens: PropTypes.array,
  }

  componentDidMount = async () => {
    try {
      await this.props.initializeWallet();
      const showShitcoins = await getShowShitcoinsSetting();
      if (showShitcoins !== null) {
        this.props.toggleShowShitcoins(showShitcoins);
      }
    } catch (error) {
      // TODO
    }
  }

  shouldComponentUpdate = (nextProps) => {
    const isNewBlurOpacity = isNewValueForPath(this.props, nextProps, 'blurOpacity');
    const isNewCurrency = isNewValueForPath(this.props, nextProps, 'nativeCurrency');
    const isNewFetchingAssets = isNewValueForPath(this.props, nextProps, 'fetchingAssets');
    const isNewFetchingUniqueTokens = isNewValueForPath(this.props, nextProps, 'fetchingUniqueTokens');
    const isNewIsWalletEmpty = isNewValueForPath(this.props, nextProps, 'isWalletEmpty');
    const isNewIsWalletEthZero = isNewValueForPath(this.props, nextProps, 'isWalletEthZero');
    const isNewLanguage = isNewValueForPath(this.props, nextProps, 'language');
    const isNewSections = isNewValueForPath(this.props, nextProps, 'sections');
    const isNewShowBlur = isNewValueForPath(this.props, nextProps, 'showBlur');
    const isNewShowShitcoins = isNewValueForPath(this.props, nextProps, 'showShitcoins');
    const isNewTransitionProps = isNewValueForPath(this.props, nextProps, 'transitionProps');

    if (!nextProps.isFocused && !nextProps.showBlur) {
      return isNewBlurOpacity
        || isNewShowBlur
        || isNewTransitionProps;
    }

    return isNewFetchingAssets
    || isNewFetchingUniqueTokens
    || isNewIsWalletEmpty
    || isNewIsWalletEthZero
    || isNewLanguage
    || isNewCurrency
    || isNewBlurOpacity
    || isNewSections
    || isNewShowShitcoins
    || isNewTransitionProps
    || isNewShowBlur;
  }

  render = () => {
    const {
      blurOpacity,
      isWalletEmpty,
      isWalletEthZero,
      navigation,
      refreshAccountData,
      scrollViewTracker,
      sections,
      showBlur,
    } = this.props;

    return (
      <Page style={{ flex: 1, ...position.sizeAsObject('100%') }}>
        {/* Line below appears to be needed for having scrollViewTracker persistent while
        reattaching of react subviews */}
        <Animated.Code
          exec={scrollViewTracker}
        />
        <FabWrapper
          sections={sections}
          disabled={isWalletEthZero}
          scrollViewTracker={scrollViewTracker}
        >
          <Header justify="space-between">
            <ProfileHeaderButton navigation={navigation} />
            <CameraHeaderButton navigation={navigation} />
          </Header>
          <AssetList
            fetchData={refreshAccountData}
            isEmpty={isWalletEmpty}
            isWalletEthZero={isWalletEthZero}
            onLayout={this.hideSplashScreen}
            scrollViewTracker={scrollViewTracker}
            sections={sections}
          />
        </FabWrapper>
        {showBlur && (
          <FadeInAnimation duration={315} style={{ ...position.coverAsObject, zIndex: 1 }}>
            <BlurOverlay
              opacity={blurOpacity}
            />
          </FadeInAnimation>
        )}
      </Page>
    );
  }
}

export default compose(
  withAccountData,
  withUniqueTokens,
  withAccountSettings,
  withDataInit,
  withUniswapLiquidity,
  withSafeTimeout,
  withNavigation,
  withNavigationFocus,
  withBlurTransitionProps,
  withIsWalletEmpty,
  withIsWalletEthZero,
  withStatusBarStyle('dark-content'),
  withState('showShitcoins', 'toggleShowShitcoins', true),
  withHandlers({
    onToggleShowShitcoins: ({ showShitcoins, toggleShowShitcoins }) => (index) => {
      if (index === 0) {
        const updatedShowShitcoinsSetting = !showShitcoins;
        toggleShowShitcoins(updatedShowShitcoinsSetting);
        updateShowShitcoinsSetting(updatedShowShitcoinsSetting);

        if (updatedShowShitcoinsSetting) {
          analytics.track('Showed shitcoins');
        } else {
          analytics.track('Hid shitcoins');
        }
      }
    },
  }),
  withProps(buildWalletSectionsSelector),
  withProps({ scrollViewTracker: new Animated.Value(0) }),
)(WalletScreen);
