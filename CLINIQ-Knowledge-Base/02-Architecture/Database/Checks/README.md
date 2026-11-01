# Database checks

`constraint-tests.sql` proves that `Reference-Schema.sql` refuses bad data, accepts good data, and can be purged. Each refusal must come from the constraint it names. Each case rolls back, except the retention purge, which runs last. The final lines list any failed case and any CHECK or UNIQUE with no test.

Run it on a scratch database, never on `cliniq`. From the `Database` folder, with XAMPP's MariaDB running:

```bash
MYSQL=/c/xampp/mysql/bin/mysql   # add -p once root has a password
$MYSQL -uroot -e "CREATE DATABASE cliniq_check_scratch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
$MYSQL -uroot --default-character-set=utf8mb4 cliniq_check_scratch < Reference-Schema.sql
$MYSQL -uroot --default-character-set=utf8mb4 --table cliniq_check_scratch < Checks/constraint-tests.sql
$MYSQL -uroot -e "DROP DATABASE cliniq_check_scratch"
```

Passing looks like one table of counts with 0 in `failed`, and nothing above it. Change this file whenever the schema changes.
