// Import the functions you need from the SDKs you need
import { getAnalytics } from "@firebase/analytics"
import { initializeApp } from "@firebase/app"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Initialize Firebase
const firebaseConfigStr = process.env.FIREBASE_CONFIG
const firebaseConfig = firebaseConfigStr ? JSON.parse(firebaseConfigStr) : {}
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)

export { app, analytics }
