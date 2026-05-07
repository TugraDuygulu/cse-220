'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useState, type FormEvent, type ReactNode } from 'react';
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
  Separator,
} from 'ui-common';
import {
  RiShieldUserLine,
  RiStore2Line,
  RiUserAddLine,
  RiUserSettingsLine,
  RiUserStarLine,
} from '@remixicon/react';

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
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[radial-gradient(circle_at_top_right,oklch(0.97_0.03_84),transparent_34rem),linear-gradient(180deg,oklch(1_0_0),oklch(0.985_0.012_90))] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <Card className="w-full max-w-md border border-border/70 shadow-sm">
          <CardHeader className="space-y-2">
            <Badge variant={isBusiness ? 'secondary' : 'outline'}>
              {isBusiness ? 'Business onboarding' : 'Reviewer onboarding'}
            </Badge>
            <CardTitle className="text-2xl">
              {isBusiness
                ? 'Create your restaurant account'
                : 'Create your reviewer account'}
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
          </CardFooter>
        </Card>
      </section>

      <aside className="hidden border-l border-border/60 bg-muted/20 lg:flex lg:items-center lg:justify-center">
        <div className="max-w-md space-y-5 px-10">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {isBusiness ? (
              <RiStore2Line className="size-6" aria-hidden="true" />
            ) : (
              <RiShieldUserLine className="size-6" aria-hidden="true" />
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isBusiness
                ? 'A cleaner way to manage your listing'
                : 'Reviews that help people decide'}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {isBusiness
                ? 'Create your restaurant profile once, then keep the listing current with photos, details, and owner replies.'
                : 'Join the reviewer path to search restaurants, compare details, and leave useful feedback in one place.'}
            </p>
          </div>

          <div className="grid gap-3">
            <StatCard
              label={isBusiness ? 'Owner tools' : 'Diner tools'}
              value={isBusiness ? 'Profile, replies, photos' : 'Browse, react, comment'}
            />
            <StatCard
              label="Next step"
              value={isBusiness ? 'Open your dashboard' : 'Open discovery map'}
            />
          </div>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile
              icon={
                isBusiness ? (
                  <RiUserSettingsLine className="size-4" />
                ) : (
                  <RiUserStarLine className="size-4" />
                )
              }
              title={isBusiness ? 'Manage the brand' : 'Trusted opinions'}
              text={
                isBusiness
                  ? 'Keep photos and details in sync.'
                  : 'Leave feedback that helps others choose.'
              }
            />
            <InfoTile
              icon={<RiUserAddLine className="size-4" />}
              title="Faster onboarding"
              text="One path for each role, without extra detours."
            />
            <InfoTile
              icon={
                isBusiness ? (
                  <RiStore2Line className="size-4" />
                ) : (
                  <RiShieldUserLine className="size-4" />
                )
              }
              title={isBusiness ? 'Business portal' : 'Reviewer portal'}
              text={
                isBusiness
                  ? 'Ready for restaurant owners.'
                  : 'Ready for diners and reviewers.'
              }
            />
          </div>
        </div>
      </aside>
    </main>
  );
}

function InfoTile({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-3">
      <div className="mb-2 inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium leading-6">{value}</p>
    </div>
  );
}
