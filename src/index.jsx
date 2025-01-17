import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import makeCancellable from 'make-cancellable-promise';

const STATES = {
  ERROR: 'error',
  INIT: 'init',
  PENDING: 'pending',
  SUCCESS: 'success',
};

const AsyncButton = React.forwardRef(
  (
    {
      as = 'button',
      errorConfig,
      onClick,
      pendingConfig,
      resetTimeout = 2000,
      successConfig,
      ...otherProps
    },
    ref,
  ) => {
    const [buttonState, setButtonState] = useState(STATES.INIT);
    const cancellablePromise = useRef();
    const timeout = useRef();

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
      (event) => {
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

    const Component = as;

    const buttonConfig = (() => {
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

    return (
      <Component
        ref={ref}
        onClick={onClick ? onClickInternal : null}
        {...otherProps}
        {...buttonConfig}
      />
    );
  },
);

AsyncButton.displayName = 'AsyncButton';

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

export default AsyncButton;
