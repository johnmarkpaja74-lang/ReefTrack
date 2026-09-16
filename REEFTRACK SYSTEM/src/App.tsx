import { Navigate, Route, Routes } from "react-router-dom"

import { LandingPage } from "@/pages/landing-page"
import { LoginPage } from "@/pages/login-page"
import { SignupPage } from "@/pages/signup-page"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
