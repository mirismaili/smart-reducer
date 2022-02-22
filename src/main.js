/**
 * Created on 1400/12/3 (2022/2/22).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */

import {useCallback, useMemo, useReducer} from 'react'
import {o} from './util.js'

function SmartReducer (logger) {
  return (state, { dispatch, promiseRef, actionName, action, actionArgsArr }) => {
    const payloadOrPayloadPromise = action.apply(state, actionArgsArr)

    if (!(payloadOrPayloadPromise instanceof Promise)) { // => 1. SYNC ACTION:
      const payload = payloadOrPayloadPromise
      const newState = { ...state, ...payload }
      logger?.(state, { type: actionName, payload }, newState)
      return newState
    }

    // 2. DUAL ACTION (SYNC + ASYNC):

    const payloadPromise = payloadOrPayloadPromise

    // 2.1. ASYNC ACTION:
    promiseRef.current = new Promise((resolve, reject) => {
      payloadPromise.then((payload) => { // 2.1.1. ON-RESOLVE ACTION:
        dispatch({
          actionName: `${actionName}:FULFILLED`,
          action: () => payload,
        })
        resolve(payload)
      }, (err) => { // 2.1.2. ON-REJECT ACTION:
        const payload = err?.[payloadSym]
        if (payload) {
          dispatch({
            actionName: `${actionName}:REJECTED`,
            action: () => payload,
          })
        }
        reject(err)
      })
    })

    /** @see {@link useSmartReducer DUAL ACTIONS NOTE} */
    const syncAction = payloadPromise.syncAction

    if (syncAction) { // 2.1. SYNC ACTION:
      const payload = syncAction.apply(state, actionArgsArr)
      const newState = { ...state, ...payload }
      logger?.(state, { type: `${actionName}:SYNC`, payload }, newState)
      return newState
    }

    return state
  }
}

const SmartDispatch = (dispatch) =>
  (actionName, action, actionArgsArr) => {
    const promiseRef = {}
    dispatch({ dispatch, promiseRef, actionName, action, actionArgsArr })
    return promiseRef.current
  }

/**
 * **DUAL ACTIONS NOTE**: The user **must NOT use `async/await`** keywords for his/her defined action, **if** he/she
 * wants to define a **dual-action (that has a `syncAction` in addition to `async` action)**. But he/she should just
 * return a `Promise` (everywhere needed). Otherwise his/her `syncAction` will be removed!
 */
export function useSmartReducer (initialState, actions, logger, initializer) {
  const { smartReducer, memorizedLogger } = useMemo(() => ({
    smartReducer: SmartReducer(logger),
    memorizedLogger: logger,
  }), [logger])

  const initializedState = useMemo(() => {
    if (initializer) {
      const initializedStateOrPromise = initializer(initialState)
      memorizedLogger?.(initialState, { type: 'INITIALIZATION', payload: initializer.name }, initializedStateOrPromise)
      return initializedStateOrPromise
    }
    return initialState
  }, [initialState, initializer])

  // noinspection JSCheckFunctionSignatures
  const [state, dispatch] = useReducer(smartReducer, initializedState)

  const smartDispatch = useCallback(SmartDispatch(dispatch), [dispatch])

  const dispatchers = useMemo(() => o(actions).map((action, actionName) =>
    (...actionArgs) => smartDispatch(actionName, action, actionArgs),
  ), [])

  return [state, dispatchers]
}

export default useSmartReducer

/**
 * The simplest logger can be used for {@link useSmartReducer `useSmartReducer()`}.
 */
export function simpleLogger (...args) {
  console.log(...args)
}

export const payloadSym = Symbol('payload')
