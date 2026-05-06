import type { Metadata } from 'next';
import { LoginPage } from '../../components/auth/LoginPage';

export const metadata: Metadata = {
  title: 'Sign in — Chat-Native E-Commerce',
};

export default function Page() {
  return <LoginPage />;
}
