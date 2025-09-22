function findUnprocessed_(max) {
  const q = 'in:inbox -label:reply_needed -label:review -label:todo -label:summarize';
  return GmailApp.search(q, 0, max);
}

function minimalize_(threads, bodyChars) {
  return threads.map(function(t) {
    const msg = t.getMessages().pop();
    const subj = msg.getSubject() || '';
    const from = msg.getFrom() || '';
    const date = msg.getDate();
    const days = Math.floor((Date.now() - date.getTime()) / (1000*60*60*24));
    const body = (msg.getPlainBody() || msg.getBody() || '').slice(0, bodyChars);
    return {
      id: msg.getId(),
      threadId: t.getId(),
      subject: subj,
      from: from,
      date: date.toISOString().slice(0,10),
      ageDays: days,
      plainBody: body
    };
  });
}
