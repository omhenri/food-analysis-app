import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { PortionSize } from '../models/types';

interface PortionIconProps {
  portion: PortionSize;
  selected?: boolean;
  size?: number;
}

export const PortionIcon: React.FC<PortionIconProps> = ({ 
  portion, 
  selected = false, 
  size = 40 
}) => {
  const baseColor = '#75F5DB';
  const backgroundColor = '#EEEEEE';
  const selectedColor = selected ? baseColor : backgroundColor;
  
  // Scale the SVG to the desired size (original is 93x172, but the circle is at cx="68" cy="159" r="7")
  // We'll focus on just the circle part and scale it appropriately
  const viewBoxSize = 20; // Focused on the circle area
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;
  const radius = 6;

  const renderPortionSVG = () => {
    switch (portion) {
      case '1/1':
        return (
          <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <Circle cx={centerX} cy={centerY} r={radius} fill={selectedColor} />
          </Svg>
        );
      
      case '1/2':
        return (
          <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <Circle cx={centerX} cy={centerY} r={radius} fill={backgroundColor} />
            <Path 
              d={`M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 1 ${centerX} ${centerY + radius} Z`}
              fill={selectedColor}
            />
          </Svg>
        );
      
      case '1/3':
        return (
          <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <Circle cx={centerX} cy={centerY} r={radius} fill={backgroundColor} />
            <Path 
              d={`M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 1 ${centerX + radius * Math.cos(Math.PI/3)} ${centerY + radius * Math.sin(Math.PI/3)} L ${centerX} ${centerY} Z`}
              fill={selectedColor}
            />
          </Svg>
        );
      
      case '1/4':
        return (
          <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <Circle cx={centerX} cy={centerY} r={radius} fill={backgroundColor} />
            <Path 
              d={`M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY} L ${centerX} ${centerY} Z`}
              fill={selectedColor}
            />
          </Svg>
        );
      
      case '1/8':
        return (
          <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <Circle cx={centerX} cy={centerY} r={radius} fill={backgroundColor} />
            <Path 
              d={`M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 0 1 ${centerX + radius * Math.cos(-Math.PI/4)} ${centerY + radius * Math.sin(-Math.PI/4)} L ${centerX} ${centerY} Z`}
              fill={selectedColor}
            />
          </Svg>
        );
      
      default:
        return (
          <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <Circle cx={centerX} cy={centerY} r={radius} fill={selectedColor} />
          </Svg>
        );
    }
  };

  return renderPortionSVG();
};
