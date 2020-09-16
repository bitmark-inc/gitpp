import * as firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'

import firebaseConfig from "../../firebase-config.json"

firebase.initializeApp(firebaseConfig)

export async function getCurrentUser() {
  const user = await new Promise((resolve, reject) => {
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      unsubscribe();
      resolve(user);
    }, reject);
  })
  if (user) {
    return user as firebase.User
  }
  return null
}

export const db = firebase.firestore()
export const auth = firebase.auth()
