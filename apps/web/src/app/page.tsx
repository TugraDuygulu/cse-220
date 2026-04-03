import {
  Card,
  CardContent,
} from 'ui-common';
import { 
  Header, 
  SearchInbox
} from './_components';


export default function Index() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10 justify-center items-center">
      <Header />

      <Card className="border border-border/70 sm:max-w-sm md:max-w-md lg:max-w-lg bg-card">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInbox />
        </CardContent>
      </Card>
    </main>
  );
}
