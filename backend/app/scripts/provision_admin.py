"""
Out-of-band administrator provisioning.

Administrators are never created through public signup or the HTTP API. An operator with
direct database access runs, from the backend directory:

    python -m app.scripts.provision_admin --phone +15550000000 --name "Ops Admin"

The phone owner then signs in through the normal OTP flow.
"""
import argparse
import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, engine, Base
from app.models.user import User
from app.models.decision import AuditEvent

async def provision_admin(phone: str, full_name: str) -> str:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.phone == phone))
        user = res.scalars().first()
        previous_role = user.role if user else None
        if user:
            user.role = "ADMIN"
            user.is_active = True
        else:
            user = User(phone=phone, full_name=full_name, role="ADMIN", is_active=True, is_verified=False)
            db.add(user)
            await db.flush()

        db.add(AuditEvent(
            actor_id=None,
            actor_name="provision_admin CLI",
            action="ADMIN_PROVISIONED",
            resource_type="User",
            resource_id=user.id,
            details={"previous_role": previous_role},
        ))
        await db.commit()
        return user.id

def main() -> None:
    parser = argparse.ArgumentParser(description="Provision a CareSync administrator account.")
    parser.add_argument("--phone", required=True, help="E.164 phone number, e.g. +15550000000")
    parser.add_argument("--name", default="CareSync Administrator")
    args = parser.parse_args()
    user_id = asyncio.run(provision_admin(args.phone, args.name))
    print(f"Administrator provisioned: user_id={user_id}")

if __name__ == "__main__":
    main()
