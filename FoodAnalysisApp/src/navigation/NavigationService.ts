import { NavigationContainerRef, StackActions } from '@react-navigation/native';
import { createRef } from 'react';

// Navigation reference
export const navigationRef = createRef<NavigationContainerRef<any>>();

// Navigation service for programmatic navigation
export class NavigationService {
  // Navigate to a screen
  static navigate(name: string, params?: any): void {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.navigate(name, params);
    }
  }

  // Go back
  static goBack(): void {
    if (navigationRef.current?.isReady() && navigationRef.current.canGoBack()) {
      navigationRef.current.goBack();
    }
  }

  // Reset navigation stack
  static reset(routeName: string, params?: any): void {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: routeName, params }],
      });
    }
  }

  // Push a new screen onto the stack
  static push(name: string, params?: any): void {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.dispatch(StackActions.push(name, params));
    }
  }

  // Replace current screen
  static replace(name: string, params?: any): void {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.dispatch(StackActions.replace(name, params));
    }
  }

  // Get current route name
  static getCurrentRouteName(): string | undefined {
    if (navigationRef.current?.isReady()) {
      return navigationRef.current.getCurrentRoute()?.name;
    }
    return undefined;
  }

  // Check if navigation is ready
  static isReady(): boolean {
    return navigationRef.current?.isReady() ?? false;
  }
}