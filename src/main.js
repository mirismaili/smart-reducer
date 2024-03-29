/**
 * Created on 1400/12/3 (2022/2/22).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */

import {useCallback, useMemo, useReducer} from 'react'
import {o} from './util.js'

function SmartReducer(logger) {
  return (state, {dispatch, deferredPromise, actionName, action, actionArgsArr}) => {
    const payloadOrPayloadPromise = action.apply(state, actionArgsArr)
  
    if (!(payloadOrPayloadPromise instanceof Promise)) { // => 1. SYNC ACTION:
      const payload = payloadOrPayloadPromise
      const newState = {...state, ...payload}
      logger?.(state, {type: actionName, payload}, newState)
      return newState
    }
  
    // 2. DUAL ACTION (SYNC + ASYNC):
  
    const payloadPromise = payloadOrPayloadPromise
  
    // 2.1. ASYNC ACTION:
    payloadPromise.then((payload) => { // 2.1.1. ON-RESOLVE ACTION:
      dispatch({
        actionName: `${actionName}:FULFILLED`,
        action: () => payload,
      })
      deferredPromise.resolve(payload)
    }, (err) => { // 2.1.2. ON-REJECT ACTION:
      const payload = err?.[payloadSym]
      if (payload) {
        dispatch({
          actionName: `${actionName}:REJECTED`,
          action: () => payload,
        })
      }
      deferredPromise.reject(err)
    })
  
    /** @see {@link useSmartReducer DUAL ACTIONS NOTE} */
    const syncAction = payloadPromise.syncAction
  
    if (syncAction) { // 2.1. SYNC ACTION:
      const payload = syncAction.apply(state, actionArgsArr)
      const newState = {...state, ...payload}
      logger?.(state, {type: `${actionName}:SYNC`, payload}, newState)
      return newState
    }
    
    return state
  }
}

const SmartDispatch = (dispatch) =>
  (actionName, action, actionArgsArr) => {
    const deferredPromise = new DeferredPromise()
    dispatch({dispatch, deferredPromise, actionName, action, actionArgsArr})
    return deferredPromise
  }

const SimpleDispatch = (dispatch) =>
  (payloadOrAction, actionName = 'ANONYMOUS_ACTION') => {
    dispatch({actionName, action: typeof payloadOrAction === 'function' ? payloadOrAction : () => payloadOrAction})
  }

/**
 * **DUAL ACTIONS NOTE**: The user **must NOT use `async/await`** keywords for his/her defined action, **if** he/she
 * wants to define a **dual-action (that has a `syncAction` in addition to `async` action)**. But he/she should just
 * return a `Promise` (everywhere needed). Otherwise, his/her `syncAction` will be removed!
 */
export function useSmartReducer(initialState, actions, logger, initializer) {
  const {smartReducer, memorizedLogger} = useMemo(() => ({
    smartReducer: SmartReducer(logger),
    memorizedLogger: logger,
  }), [logger])
  
  const initializedState = useMemo(() => {
    if (initializer) {
      const initializedStateOrPromise = initializer(initialState)
      memorizedLogger?.(initialState, {type: 'INITIALIZATION', payload: initializer.name}, initializedStateOrPromise)
      return initializedStateOrPromise
    }
    return initialState
  }, [initialState, initializer])
  
  // noinspection JSCheckFunctionSignatures
  const [state, dispatch] = useReducer(smartReducer, initializedState)
  
  const smartDispatch = useCallback(SmartDispatch(dispatch), [])
  
  const simpleDispatch = useCallback(SimpleDispatch(dispatch), [])
  
  const dispatchers = useMemo(() => o(actions).map((action, actionName) =>
    (...actionArgs) => smartDispatch(actionName, action, actionArgs),
  ).o, [])
  
  return Object.assign( // destructure-able using both ...
    [state, dispatchers, simpleDispatch], // `[...]` and ...
    {state, dispatchers, dispatch: simpleDispatch}, // `{...}` syntax
  )
}

export default useSmartReducer

/**
 * The simplest logger can be used for {@link useSmartReducer `useSmartReducer()`}.
 *
 * Don't write this as ~~`simpleLogger = console.log`~~ or ~~`simpleLogger = console.log.bind(console)`~~ because of
 * dangerous react work in modifying `console.{log|info|...}`!
 * @see {@link https://github.com/facebook/react/issues/21783 Community feedback on console silencing}
 * @see {@link https://github.com/facebook/react/pull/18547 Disable console.logs in the second render pass of DEV mode double render}
 */
export function simpleLogger(...args) {
  console.log(...args)
}

export const payloadSym = Symbol('payload')

/**
 * @see https://stackoverflow.com/a/48159603/5318303
 */
class DeferredPromise extends Promise {
  constructor() {
    const executor = arguments[0]
    if (executor) return super(executor)
    
    let promiseController
    super((resolve, reject) => {
      promiseController = {resolve, reject}
    })
    Object.assign(this, promiseController)
  }
  
  /**
   * Return a `Promise` from then/catch/finally.
   * @see https://stackoverflow.com/a/60328122/5318303
   * @returns {PromiseConstructor}
   */
  static get [Symbol.species]() {
    return Promise
  }
  
  get [Symbol.toStringTag]() {
    return 'DeferredPromise'
  }
}
