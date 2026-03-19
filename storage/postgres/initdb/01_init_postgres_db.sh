#!/bin/bash
set -e

# Helper to read secrets.
get_secret() {
    if [ -f "/run/secrets/$1" ]; then
        cat "/run/secrets/$1"
    else
        echo "Error: Secret $1 not found" >&2
        exit 1
    fi
}

APP_USER=$(get_secret "lto_app_user")
APP_PASS=$(get_secret "lto_app_password")
HC_USER=$(get_secret "healthcheck_user")
HC_PASS=$(get_secret "healthcheck_password")

ADMIN_USER=$(get_secret "postgres_user")

psql -v ON_ERROR_STOP=1 --username="$ADMIN_USER" --dbname="$POSTGRES_DB" <<-EOSQL

    DO \$$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$HC_USER') THEN
            CREATE ROLE $HC_USER LOGIN PASSWORD '$HC_PASS';
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$APP_USER') THEN
            CREATE ROLE $APP_USER LOGIN CREATEDB PASSWORD '$APP_PASS';
        END IF;
    END
    \$$;

    GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO $HC_USER;
    ALTER DATABASE "$POSTGRES_DB" OWNER TO $APP_USER;
    
    \c "$POSTGRES_DB"
    CREATE SCHEMA IF NOT EXISTS app_schema AUTHORIZATION $APP_USER;
EOSQL