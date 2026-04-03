# API Nx Command Reference

Use this file as a quick reference for Django backend workflows through Nx.

## Run From Workspace Root

All commands below assume current directory is repository root.

## Core Django Commands

```bash
./nx run api:runserver
./nx run api:makemigrations
./nx run api:makemigrations-check
./nx run api:migrate
./nx run api:showmigrations
./nx run api:createsuperuser
./nx run api:shell
./nx run api:check
./nx run api:collectstatic
./nx run api:test
```

## api-http Library Commands

```bash
./nx run api-http:install
./nx run api-http:test
./nx run api-http:build
```

## Generic Manage.py Wrapper

Use this when a specific Nx target does not exist yet:

```bash
./nx run api:django -- <manage.py args>
```

Examples:

```bash
./nx run api:django -- help
./nx run api:django -- migrate --plan
./nx run api:django -- dumpdata users.User
```

## Python/Poetry Plugin Commands

```bash
./nx run api:install
./nx run api:lock
./nx run api:sync
./nx run api:add
./nx run api:update
./nx run api:remove
./nx run api:build
```

## Related Documentation

- `apps/api/README.md`
- `libs/api-http/README.md`
- `docs/TECHNICAL_SPECIFICATION.md`
