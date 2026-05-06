'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
} from 'ui-common';
import { RiArrowRightLine } from '@remixicon/react';

import { registerUser } from '../_lib/auth-api';
import {
  buildRegisterPayload,
  destinationForRole,
  usernameFromEmail,
  type AuthVariant,
} from '../_lib/auth-flow';
import { EmailField, PasswordField } from './auth-fields';

type SignUpProps = {
  variant: AuthVariant;
};

export function SignUp({ variant }: SignUpProps) {
  const router = useRouter();
  const isBusiness = variant === 'business';
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await registerUser(
        buildRegisterPayload({
          email,
          password,
          displayName,
          username,
          variant,
        }),
      );
      startTransition(() => router.push(destinationForRole(user.role)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
        <Card className="w-full max-w-md border border-border/70 shadow-sm">
          <CardHeader className="space-y-2">
            <Badge variant={isBusiness ? 'secondary' : 'outline'}>
              {isBusiness ? 'Business onboarding' : 'Reviewer onboarding'}
            </Badge>
            <CardTitle className="text-2xl">
              {isBusiness ? 'Create your restaurant account' : 'Create your reviewer account'}
            </CardTitle>
            <CardDescription>
              {isBusiness
                ? 'Start with your account, then create the first listing from your dashboard.'
                : 'Join FlavorMap to discover restaurants and leave useful reviews.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/30 p-2">
              <Button
                asChild
                variant={isBusiness ? 'secondary' : 'default'}
                size="sm"
                className="w-full"
              >
                <Link href="/auth/sign-up">Reviewer</Link>
              </Button>
              <Button
                asChild
                variant={isBusiness ? 'default' : 'secondary'}
                size="sm"
                className="w-full"
              >
                <Link href="/business/sign-up">Business</Link>
              </Button>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label htmlFor="display-name" className="text-xs font-medium text-foreground">
                  {isBusiness ? 'Business display name' : 'Display name'}
                </label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder={isBusiness ? 'Ada Bistro' : 'Jane Foodie'}
                  required
                  disabled={isSubmitting}
                  autoComplete="name"
                />
              </div>

              <EmailField
                value={email}
                onChange={setEmail}
                disabled={isSubmitting}
                autoFocus
              />

              <div className="space-y-2">
                <label htmlFor="username" className="text-xs font-medium text-foreground">
                  Username
                </label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={email ? usernameFromEmail(email) : 'flavormap-user'}
                  disabled={isSubmitting}
                  autoComplete="username"
                />
                <p className="text-[0.7rem] text-muted-foreground">
                  Leave blank to use the suggestion from your email.
                </p>
              </div>

              <PasswordField
                label="Password"
                value={password}
                onChange={setPassword}
                disabled={isSubmitting}
                autoComplete="new-password"
                minLength={8}
              />
              <PasswordField
                id="confirm-password"
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                disabled={isSubmitting}
                autoComplete="new-password"
                minLength={8}
              />

              {error && (
                <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

          </CardContent>

          <CardFooter className="flex-col items-start gap-3 border-t border-border/60 px-4 pt-4">
            <p className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link
                href={isBusiness ? '/business/sign-in' : '/auth/sign-in'}
                className="text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
            <Link
              href={isBusiness ? '/auth/sign-up' : '/business/sign-up'}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {isBusiness ? 'Create a reviewer account' : 'Register a restaurant business'}
              <RiArrowRightLine className="size-3" aria-hidden="true" />
            </Link>
          </CardFooter>
        </Card>
  );
}
