# Database Server Setup Guide

## Starting PostgreSQL Database Server

### Option 1: Using PostgreSQL Service (Windows)

If PostgreSQL is installed as a Windows service:

1. **Open Services:**
   - Press `Win + R`
   - Type `services.msc` and press Enter
   - Look for "postgresql-x64-XX" (where XX is version number)

2. **Start the Service:**
   - Right-click on PostgreSQL service
   - Click "Start"
   - Or double-click and click "Start" button

### Option 2: Using Command Line (PowerShell as Administrator)

```powershell
# Start PostgreSQL service
Start-Service postgresql-x64-16
# Or try: Start-Service postgresql-x64-15
# Or try: Start-Service postgresql-x64-14
```

### Option 3: Using pg_ctl (if installed)

```powershell
# Navigate to PostgreSQL bin directory (adjust path as needed)
cd "C:\Program Files\PostgreSQL\16\bin"

# Start server
.\pg_ctl.exe -D "C:\Program Files\PostgreSQL\16\data" start
```

### Option 4: Using Docker (if using Docker)

```bash
docker run --name postgres-myerp -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_DB=myerp -p 5432:5432 -d postgres:16
```

---

## Verify Database Connection

### Check if PostgreSQL is Running

```powershell
# Check if port 5432 is listening
Test-NetConnection -ComputerName localhost -Port 5432
```

### Connect to Database

```powershell
# Using psql (if installed)
psql -U postgres -d myerp -h localhost -p 5432
```

---

## Database Configuration

### Check Environment Variables

Make sure your `.env` file in `packages/db-schema/` has:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/myerp?schema=public"
```

**Default PostgreSQL credentials:**

- Username: `postgres`
- Password: (set during installation)
- Host: `localhost`
- Port: `5432`
- Database: `myerp`

---

## Apply Migration After Starting Database

Once PostgreSQL is running:

```bash
cd packages/db-schema
pnpm prisma migrate deploy
pnpm prisma generate
```

---

## Troubleshooting

### Error: "Can't reach database server"

1. **Check if PostgreSQL is installed:**

   ```powershell
   Get-Service | Where-Object {$_.Name -like "*postgres*"}
   ```

2. **Check if port 5432 is in use:**

   ```powershell
   netstat -ano | findstr :5432
   ```

3. **Check PostgreSQL logs:**
   - Usually in: `C:\Program Files\PostgreSQL\16\data\log\`
   - Or check Windows Event Viewer

### Error: "password authentication failed"

- Check your `.env` file for correct password
- Reset PostgreSQL password if needed:
  ```sql
  ALTER USER postgres WITH PASSWORD 'newpassword';
  ```

### Error: "database does not exist"

Create the database:

```sql
CREATE DATABASE myerp;
```

---

## Quick Start Commands

```powershell
# 1. Start PostgreSQL service
Start-Service postgresql-x64-16

# 2. Verify connection
Test-NetConnection -ComputerName localhost -Port 5432

# 3. Apply migration
cd packages/db-schema
pnpm prisma migrate deploy
pnpm prisma generate
```

---

## Alternative: Install PostgreSQL

If PostgreSQL is not installed:

1. Download from: https://www.postgresql.org/download/windows/
2. Run installer
3. Remember the password you set for `postgres` user
4. Use that password in your `.env` file
