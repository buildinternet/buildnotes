| Option | Verdict | Why |
|---|---|---|
| One shared database | rejected | Migrations on one branch break every other preview. |
| **Database per branch** | chosen | Full isolation, for the cost of a copy that takes about 20 seconds. |
| Schema per branch | rejected | Isolated tables, but extensions and roles are still shared. |
