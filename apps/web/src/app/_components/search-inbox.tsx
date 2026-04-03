
import {
  Button,
  Input,
} from 'ui-common';

export function SearchInbox() {
  return (
    <>
        <Input
          placeholder="Search neighborhoods, cuisines, or places"
          className="w-full"
        />
        <Button>Search</Button>
    </>
  );
}
