import PropTypes from 'prop-types';
import { createElement } from 'react';
import Flex from '../layout/Flex';

import ArrowIcon from './svg/ArrowIcon';
import AvatarIcon from './svg/AvatarIcon';
import BalanceLogoIcon from './svg/BalanceLogoIcon';
import CameraIcon from './svg/CameraIcon';
import CaretIcon from './svg/CaretIcon';
import ClockIcon from './svg/ClockIcon';
import CloseIcon from './svg/CloseIcon';
import DotIcon from './svg/DotIcon';
import FaceIdIcon from './svg/FaceIdIcon';
import HandleIcon from './svg/HandleIcon';
import ProgressIcon from './svg/ProgressIcon';
import SendIcon from './svg/SendIcon';
import SpinnerIcon from './svg/SpinnerIcon';
import ThreeDotsIcon from './svg/ThreeDotsIcon';
import TouchIdIcon from './svg/TouchIdIcon';
import WalletConnectIcon from './svg/WalletConnectIcon';
import WarningIcon from './svg/WarningIcon';

const Icon = ({ name, ...props }) =>
  createElement((Icon.IconTypes[name] || Flex), props);

Icon.propTypes = {
  name: PropTypes.string,
};

Icon.IconTypes = {
  arrow: ArrowIcon,
  avatar: AvatarIcon,
  balanceLogo: BalanceLogoIcon,
  camera: CameraIcon,
  caret: CaretIcon,
  clock: ClockIcon,
  close: CloseIcon,
  dot: DotIcon,
  faceid: FaceIdIcon,
  handle: HandleIcon,
  progress: ProgressIcon,
  spinner: SpinnerIcon,
  threeDots: ThreeDotsIcon,
  touchid: TouchIdIcon,
  walletConnect: WalletConnectIcon,
  send: SendIcon,
  warning: WarningIcon,
};

export default Icon;
