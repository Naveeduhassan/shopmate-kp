/**
 * Styled confirmation dialog — replaces browser confirm().
 * Usage: const ok = await confirm({ title, message, confirmText, icon })
 */
import { useState, useCallback } from 'react';

let resolveRef = null;

// Singleton state — rendered once at app root
let _setDialogState = null;

export function ConfirmDialogProvider({ children }) {
  const [state, setState] = useState(null);
  _setDialogState = setState;

  const handleResult = (result) => {
    setState(null);
    if (resolveRef) { resolveRef(result); resolveRef = null; }
  };

  return (
    <>
      {children}
      {state && (
        <div className="confirm-overlay" onClick={() => handleResult(false)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">{state.icon || '❓'}</div>
            <div className="confirm-title">{state.title}</div>
            <div className="confirm-msg">{state.message}</div>
            <div className="confirm-btns">
              <button className="btn btn-ghost" onClick={() => handleResult(false)}>
                Cancel
              </button>
              <button
                className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => handleResult(true)}
              >
                {state.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Call this to show a styled confirm dialog.
 * Returns a Promise<boolean>.
 */
export function showConfirm({ title, message, confirmText = 'Confirm', icon = '❓', danger = false }) {
  return new Promise((resolve) => {
    resolveRef = resolve;
    if (_setDialogState) {
      _setDialogState({ title, message, confirmText, icon, danger });
    } else {
      resolve(window.confirm(`${title}\n${message}`)); // fallback
    }
  });
}
