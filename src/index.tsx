import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import makeCancellable from 'make-cancellable-promise';

type Config<T extends React.ElementType> = React.ComponentPropsWithoutRef<T>;

type AsyncButtonProps<T extends React.ElementType> = {
  as?: T;
  errorConfig?: Config<T>;
  onClick?: (event: React.MouseEvent) => void | Promise<void>;
  pendingConfig?: Config<T>;
  resetTimeout?: number;
  successConfig?: Config<T>;
} & Config<T>;

const STATES = {
  ERROR: 'error',
  INIT: 'init',
  PENDING: 'pending',
  SUCCESS: 'success',
} as const;

export default function AsyncButton<T extends React.ElementType = 'button'>({
  as,
  errorConfig,
  onClick,
  pendingConfig,
  resetTimeout = 2000,
  successConfig,
  ...otherProps
}: AsyncButtonProps<T>) {
  const [buttonState, setButtonState] = useState<typeof STATES[keyof typeof STATES]>(STATES.INIT);
  const cancellablePromise = useRef<ReturnType<typeof makeCancellable>>();
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(
    () => () => {
      if (cancellablePromise.current) {
        cancellablePromise.current.cancel();
      }
      clearTimeout(timeout.current);
    },
    [],
  );

  const onClickInternal = useCallback(
    (event: React.MouseEvent) => {
      if (!onClick) {
        return;
      }

      clearTimeout(timeout.current);

      const onSuccess = () => {
        setButtonState(STATES.SUCCESS);
      };

      const onError = () => {
        setButtonState(STATES.ERROR);
      };

      const finallyCallback = () => {
        timeout.current = setTimeout(() => {
          setButtonState(STATES.INIT);
        }, resetTimeout);
      };

      try {
        const result = onClick(event);
        setButtonState(STATES.PENDING);

        if (result instanceof Promise) {
          cancellablePromise.current = makeCancellable(result);
          cancellablePromise.current.promise
            .then(onSuccess)
            .catch(onError)
            .finally(finallyCallback);
        } else {
          onSuccess();
          finallyCallback();
        }
      } catch (error) {
        onError();
        finallyCallback();
      }
    },
    [onClick, resetTimeout],
  );

  const Component = as || 'button';

  const buttonConfig: Config<typeof Component> | null | undefined = (() => {
    switch (buttonState) {
      case STATES.ERROR:
        return errorConfig;
      case STATES.PENDING:
        return pendingConfig;
      case STATES.SUCCESS:
        return successConfig;
      default:
        return null;
    }
  })();

  return <Component onClick={onClick ? onClickInternal : null} {...otherProps} {...buttonConfig} />;
}

const configProps = {
  children: PropTypes.node,
  className: PropTypes.string,
};

const isConfigObject = PropTypes.shape(configProps);

AsyncButton.propTypes = {
  ...configProps,
  errorConfig: isConfigObject,
  onClick: PropTypes.func,
  pendingConfig: isConfigObject,
  resetTimeout: PropTypes.number,
  successConfig: isConfigObject,
};