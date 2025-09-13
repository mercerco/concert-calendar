(function(){
  const { EDIT_SHEET_URL, PUBLISHED_CSV_URL, DISPLAY_TZ } = window.CALENDAR_CONFIG || {};

  const editSheetLink = document.getElementById('editSheetLink');
  if (editSheetLink && EDIT_SHEET_URL) editSheetLink.href = EDIT_SHEET_URL;

  document.getElementById('refreshBtn')?.addEventListener('click', () => location.reload());

  async function fetchEvents(){
    if (!PUBLISHED_CSV_URL){
      console.error('Missing PUBLISHED_CSV_URL in config.js');
      return [];
    }
    const csvText = await fetch(PUBLISHED_CSV_URL, { cache: 'no-store' }).then(r => r.text());
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' });

    const rows = parsed.data || [];
    const events = rows.map((r, idx) => rowToEvent(r, idx)).filter(Boolean);
    return events;
  }

  function parseTimeTo24h(str){
    if (!str) return null;
    const t = str.trim();
    const d = dayjs(t, ["h:mm A","h A","HH:mm"], true);
    return d.isValid() ? d.format("HH:mm") : null;
  }

  function rowToEvent(r, idx){
    const date = (r['Date']||'').trim();
    const title = (r['Title']||'').trim();
    if (!date || !title) return null;

    const time24 = parseTimeTo24h(r['Time']);
    const venue = (r['Venue']||'').trim();
    const city = (r['City']||'').trim();
    const notes = (r['Notes']||'').trim();
    const ticket = (r['TicketLink']||'').trim();
    const album = (r['AlbumURL']||'').trim();
    const createdBy = (r['CreatedBy']||'').trim();
    const rowLink = (r['RowLink']||'').trim();

    const attendees = (r['Attendees']||'')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const start = time24 ? `${date}T${time24}:00` : `${date}`;

    const id = `${date}_${title.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}_${idx}`;

    return {
      id,
      title,
      start,
      allDay: !time24,
      extendedProps: {
        venue, city, notes, ticket, album, attendees, createdBy, rowLink,
      }
    };
  }

  function buildIcs(ev){
    const dt = dayjs(ev.start);
    const isAllDay = !!ev.allDay;
    const dtstamp = dayjs().utc().format('YYYYMMDDTHHmmss[Z]');
    const dtStart = isAllDay ? dt.format('YYYYMMDD') : dt.format('YYYYMMDDTHHmmss');
    const dtEnd = isAllDay ? dt.add(1,'day').format('YYYYMMDD') : dt.add(2,'hour').format('YYYYMMDDTHHmmss');
    const loc = [ev.extendedProps.venue, ev.extendedProps.city].filter(Boolean).join(', ');
    const desc = (ev.extendedProps.notes||'') + (ev.extendedProps.ticket? `\nTickets: ${ev.extendedProps.ticket}`:'');

    return [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Friends Concert Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${ev.id}@friendscalendar`,
      `DTSTAMP:${dtstamp}`,
      isAllDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
      isAllDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICS(ev.title)}`,
      loc ? `LOCATION:${escapeICS(loc)}` : '',
      desc ? `DESCRIPTION:${escapeICS(desc)}` : '',
      'END:VEVENT','END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
  }
  function escapeICS(s){
    return String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/, '\\,');
  }

  const modal = document.getElementById('eventModal');
  const closeModal = document.getElementById('closeModal');
  closeModal?.addEventListener('click', () => hideModal());
  modal?.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });

  function showModal(ev){
    if (!modal) return;
    const tz = DISPLAY_TZ || dayjs.tz.guess();

    document.getElementById('mTitle').textContent = ev.title;
    const start = dayjs(ev.start);

    const dateStr = ev.allDay ? start.tz(tz).format('ddd, MMM D, YYYY') : start.tz(tz).format('ddd, MMM D, YYYY');
    const timeStr = ev.allDay ? '(all day)' : start.tz(tz).format('h:mm A');

    document.getElementById('mDate').textContent = dateStr;
    document.getElementById('mTime').textContent = timeStr;

    document.getElementById('mVenue').textContent = ev.extendedProps.venue || '—';
    document.getElementById('mCity').textContent = ev.extendedProps.city || '—';
    document.getElementById('mNotes').textContent = ev.extendedProps.notes || '';

    const chips = document.getElementById('mAttendees');
    chips.innerHTML = '';
    (ev.extendedProps.attendees||[]).forEach(name => {
      const span = document.createElement('span');
      span.className = 'chip';
      span.textContent = name;
      chips.appendChild(span);
    });
    if ((ev.extendedProps.attendees||[]).length === 0){
      const hint = document.createElement('span');
      hint.className = 'chip';
      hint.style.opacity = .7;
      hint.textContent = 'No RSVPs yet';
      chips.appendChild(hint);
    }

    const tix = document.getElementById('mTickets');
    const alb = document.getElementById('mAlbum');
    const sh = document.getElementById('mSheet');
    const ics = document.getElementById('mICS');

    if (ev.extendedProps.ticket){ tix.href = ev.extendedProps.ticket; tix.style.display='inline-flex'; }
    else { tix.style.display='none'; }
    if (ev.extendedProps.album){ alb.href = ev.extendedProps.album; alb.style.display='inline-flex'; }
    else { alb.style.display='none'; }

    sh.href = ev.extendedProps.rowLink || EDIT_SHEET_URL || '#';

    const blob = new Blob([buildIcs(ev)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    ics.href = url;
    ics.download = `${ev.title.replace(/[^a-z0-9]+/gi,'-')}.ics`;

    modal.setAttribute('aria-hidden','false');
  }
  function hideModal(){
    modal?.setAttribute('aria-hidden','true');
  }

  document.addEventListener('DOMContentLoaded', async function(){
    const calendarEl = document.getElementById('calendar');
    const events = await fetchEvents();

    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      height: 'auto',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listMonth'
      },
      events,
      eventClick: function(info){
        info.jsEvent.preventDefault();
        showModal(info.event);
      },
    });

    calendar.render();
  });
})();
