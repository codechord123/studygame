// Firebase 설정값(환경변수만 — firebase SDK 는 import 하지 않는다).
// 이 파일을 가볍게 유지해야 Firebase 미사용 시 SDK 가 번들에 들어가지 않는다.
// 실제 초기화·SDK 사용은 동적 로드되는 firebaseStore.ts 안에서만 일어난다.

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// 핵심 값이 모두 있으면 Firebase 모드 ON.
export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)
