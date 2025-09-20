import React from 'react'
import { Layout } from '@/app/components/Layout'
import StudentDashboard from '@/app/components/dashboards/StudentDashboard'

export default function StudentPage() {
  return (
    <Layout>
      <StudentDashboard />
    </Layout>
  )
}
