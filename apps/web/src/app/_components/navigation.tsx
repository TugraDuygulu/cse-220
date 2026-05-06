import 'ui-common/styles/global.css';
import { Button } from 'ui-common';
import Link from 'next/link';


function NavigationRegisteration() {
  return (
    <ul className="flex h-full items-center justify-end gap-2">
      <li>
        <Button size="lg" asChild>
          <Link href="/auth/sign-in">
            Sign In
          </Link>
        </Button>
      </li>
      <li>
        <Button variant="outline" size="lg" asChild>
          <Link href="/auth/sign-up">
            Sign Up
          </Link>
        </Button>
      </li>
    </ul>
  )
}

export function Navigation() {
  return <nav className="mx-auto flex w-full max-w-7xl flex-row items-center justify-between p-6">
    <h1 className="text-2xl font-bold">
      <Link href="/">
        Flavor Map
      </Link>
    </h1>
    <NavigationRegisteration />
  </nav>;
}
