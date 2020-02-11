import PropTypes from 'prop-types';
import React from 'react';
import { withProps } from 'recompact';
import { colors } from '../../styles';
import { ButtonPressAnimation } from '../animations';
import { Icon } from '../icons';
import { Centered, FlexItem, Row } from '../layout';
import { Rounded } from '../text';

const KeyColor = colors.alpha(colors.blueGreyDark, 0.8);
const defaultTransform = { transform: [{ scale: 0.5 }] };

const KeyboardButton = ({ children, ...props }) => (
  <ButtonPressAnimation
    {...props}
    duration={35}
    scaleTo={1.6}
    transformOrigin="keyboard"
  >
    <Centered height={64} style={defaultTransform} width={80}>
      {children}
    </Centered>
  </ButtonPressAnimation>
);

const KeyboardRow = withProps({
  align: 'center',
  justify: 'space-between',
  width: '100%',
})(Row);

const VirtualKeyboard = ({ decimal, onPress, ...props }) => {
  const renderCell = symbol => (
    <KeyboardButton key={symbol} onPress={() => onPress(symbol.toString())}>
      <Rounded align="center" color={KeyColor} size={44} weight="bold">
        {symbol}
      </Rounded>
    </KeyboardButton>
  );

  const renderRow = cells => <KeyboardRow>{cells.map(renderCell)}</KeyboardRow>;

  return (
    <Centered direction="column" {...props}>
      {renderRow([1, 2, 3])}
      {renderRow([4, 5, 6])}
      {renderRow([7, 8, 9])}
      <KeyboardRow>
        {decimal ? renderCell('.') : <FlexItem />}
        {renderCell(0)}
        <KeyboardButton onPress={() => onPress('back')}>
          <Icon align="center" color={KeyColor} name="backspace" width={40} />
        </KeyboardButton>
      </KeyboardRow>
    </Centered>
  );
};

VirtualKeyboard.propTypes = {
  decimal: PropTypes.bool,
  onPress: PropTypes.func.isRequired,
};

VirtualKeyboard.defaultProps = {
  decimal: true,
};

export default React.memo(VirtualKeyboard);
