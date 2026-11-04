-- Preserve every submission while keeping only the latest approval per contact.
-- Normalize spacing exactly as the application does; never delete a guest response.
with ranked as (
 select id,row_number() over (
  partition by phone,lower(regexp_replace(btrim(contact_name),'[[:space:]]+',' ','g'))
  order by created_at desc,id desc
 ) as position from lola15.rsvps where status='approved'
)
update lola15.rsvps r set status='superseded',reviewed_at=now()
from ranked where r.id=ranked.id and ranked.position>1;
drop index if exists lola15.lola15_one_approved_response;
create unique index lola15_one_approved_response
 on lola15.rsvps(phone,lower(regexp_replace(btrim(contact_name),'[[:space:]]+',' ','g')))
 where status='approved';
