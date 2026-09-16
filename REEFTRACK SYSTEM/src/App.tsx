import { Navigate, Route, Routes } from "react-router-dom"

import { LandingPage } from "@/pages/landing-page"
import { LoginPage } from "@/pages/login-page"
import { SignupPage } from "@/pages/signup-page"
import { DemoLoginPage } from "@/pages/demo-login-page"

export default function App() {
  return (
    <Routes>
      {import.meta.env.DEV && <Route path="/demo" element={<DemoLoginPage />} />}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={import.meta.env.DEV ? <DemoLoginPage /> : <LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
