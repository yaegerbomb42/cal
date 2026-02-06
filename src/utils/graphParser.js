/**
 * Graph Parser Utility
 * Ported from wee.html - deterministic parsing and graph data generation
 */

export const RX = {
    quoteTitle: /[“"](.*?)[”"]/,
    day: /\b(mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)\b/i,
    time: /\b(\d{1,2}:\d{2}\s?(am|pm)|\d{1,2}\s?(am|pm))\b/i,
    durationWeeks: /\bfor\s+(\d+)\s+weeks?\b/i,
    durationMin: /\b(\d+)\s*(min|mins|minutes)\b/i,
    reminderBefore: /\b(\d+)\s*(min|mins|minutes|hour|hours)\s+before\b/i,
    travel: /\btravel\s*time\b/i,
    every: /\bevery\b/i,
    recurrence: /\b(weekly|daily|monthly|recurring|repeat|repeating)\b/i,
    starting: /\b(starting|start)\b/i,
    nextWord: /\bnext\b/i,
    conflict: /\b(conflict|if there’s a conflict|if there is a conflict|move it)\b/i,
    shareWith: /\bshare with\b/i,
    stateIL: /\bIL\b/i
};

export const splitClauses = (text) => {
    return text.replace(/\n+/g, " ")
        .split(/(?:\.\s+|;\s+|,\s+|\balso:\s+)/i)
        .map(s => s.trim()).filter(Boolean);
};

export const tokenize = (text) => {
    const raw = text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
    return raw.match(/[“”"']|[A-Za-z]+(?:'[A-Za-z]+)?|\d{1,2}:\d{2}|\d+|[^\s]/g) || [];
};

export const extractFields = (text) => {
    const out = {
        title: null, location: null, dayOfWeek: null, time: null,
        durationWeeks: null, travelMin: null, reminderBefore: null,
        conflictRule: null, attendees: [], risks: []
    };

    const mTitle = text.match(RX.quoteTitle);
    if (mTitle) out.title = mTitle[1];

    const mDay = text.match(RX.day);
    if (mDay) out.dayOfWeek = mDay[0];

    const mTime = text.match(RX.time);
    if (mTime) out.time = mTime[0];

    const mW = text.match(RX.durationWeeks);
    if (mW) out.durationWeeks = parseInt(mW[1], 10);

    const travelIdx = text.toLowerCase().indexOf("travel time");
    if (travelIdx >= 0) {
        const before = text.slice(Math.max(0, travelIdx - 40), travelIdx + 30);
        const mMin = before.match(RX.durationMin);
        if (mMin) out.travelMin = parseInt(mMin[1], 10);
    }

    const mRem = text.match(RX.reminderBefore);
    if (mRem) {
        const n = parseInt(mRem[1], 10);
        const unit = mRem[2].toLowerCase().startsWith("hour") ? "hours" : "minutes";
        out.reminderBefore = { n, unit };
    }

    if (RX.conflict.test(text)) {
        const mDay2 = text.match(/\bto\s+(mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)\b/i);
        const mTime2 = text.match(/\bat\s+(\d{1,2}:\d{2}\s?(am|pm)|\d{1,2}\s?(am|pm))\b/i);
        out.conflictRule = { moveToDay: mDay2 ? mDay2[1] : null, moveToTime: mTime2 ? mTime2[1] : null };
    }

    const sharePos = text.toLowerCase().indexOf("share with");
    if (sharePos >= 0) {
        const tail = text.slice(sharePos + "share with".length);
        const names = tail.split(/(?:\+|,|\band\b)/i)
            .map(s => s.replace(/[^\w\s'-]/g, "").trim())
            .filter(Boolean);
        out.attendees = names.slice(0, 8);
    }

    const locMatch = text.match(/\b(at|in)\s+(.+?)(?=\s+(every|on|starting|add|remind|and|if)\b|$)/i);
    if (locMatch) {
        const loc = locMatch[2].replace(/\s+/g, " ").trim();
        if (loc && !loc.toLowerCase().startsWith("“")) out.location = loc;
    }

    if (!out.title) out.risks.push("Missing title (use quotes like “...” )");
    if (!out.location) out.risks.push("Missing location (try “at …” or “in …”)");
    if (!out.time) out.risks.push("Missing time");
    if (!out.dayOfWeek && (RX.every.test(text) || RX.recurrence.test(text))) out.risks.push("Recurrence mentioned but day-of-week missing");
    if (RX.starting.test(text) && !RX.nextWord.test(text) && !/\b\d{4}-\d{2}-\d{2}\b/.test(text)) out.risks.push("Start date is ambiguous");

    return out;
};

const hit = (t) => {
    const s = t.toString();
    return (RX.time.test(s) || RX.day.test(s) || RX.durationWeeks.test(s) || RX.reminderBefore.test(s) || RX.conflict.test(s) || RX.stateIL.test(s) || RX.travel.test(s)) ? 1 : 0;
};

const evidenceMatch = (label, token, value) => {
    const t = token.toLowerCase();
    if (label === "TITLE" && value) return value.toLowerCase().includes(t) && t.length > 2;
    if (label === "LOCATION" && value) return value.toLowerCase().includes(t) && t.length > 2;
    if (label === "RECURRENCE") return RX.day.test(token) || RX.every.test(token) || RX.recurrence.test(token);
    if (label === "TIME") return RX.time.test(token) || t === "pm" || t === "am" || t.includes(":");
    if (label === "DURATION") return t === "for" || t === "weeks" || t === "week" || RX.durationWeeks.test(token);
    if (label === "REMINDER") return t === "remind" || t === "before" || RX.reminderBefore.test(token);
    if (label === "TRAVEL_TIME") return t === "travel" || t === "time" || RX.durationMin.test(token);
    if (label === "CONFLICT_RULE") return t === "conflict" || t === "move" || t === "if";
    if (label === "ATTENDEES") return t === "share" || t === "with" || t.length > 2;
    return false;
};

export const buildGraphData = (text) => {
    const clauses = splitClauses(text);
    const tokens = tokenize(text);
    const fields = extractFields(text);

    const nodes = [];
    const links = [];

    nodes.push({ id: "S", kind: "sentence", label: "SENTENCE", text, score: 1.0 });

    clauses.forEach((c, i) => {
        const cid = `C${i + 1}`;
        nodes.push({ id: cid, kind: "clause", label: `CLAUSE ${i + 1}`, text: c, score: 0.85 });
        links.push({ source: "S", target: cid, type: "contains", weight: 0.65 });
    });

    tokens.forEach((t, i) => {
        const tid = `T${i + 1}`;
        nodes.push({ id: tid, kind: "token", label: t, text: `token #${i + 1}`, score: 0.45 + hit(t) * 0.25 });
        const clauseIndex = clauses.findIndex(c => c.toLowerCase().includes(t.toLowerCase()));
        const parent = clauseIndex >= 0 ? `C${clauseIndex + 1}` : "S";
        links.push({ source: parent, target: tid, type: "contains", weight: 0.35 });
    });

    function addEntity(kind, label, value, score = 0.9) {
        const eid = `E_${label}`;
        nodes.push({ id: eid, kind, label, text: value ?? "", score });
        tokens.forEach((t, i) => {
            if (evidenceMatch(label, t, value)) links.push({ source: `T${i + 1}`, target: eid, type: "evidence", weight: 0.55 });
        });
        links.push({ source: "S", target: eid, type: "supports", weight: 0.30 });
        return eid;
    }

    const titleId = fields.title ? addEntity("title", "TITLE", fields.title, 0.96) : null;
    const locId = fields.location ? addEntity("location", "LOCATION", fields.location, 0.88) : null;
    const recurId = fields.dayOfWeek ? addEntity("recurrence", "RECURRENCE", `every ${fields.dayOfWeek}`, 0.90) : null;
    const timeId = fields.time ? addEntity("time", "TIME", fields.time, 0.92) : null;

    const durId = (fields.durationWeeks != null)
        ? addEntity("duration", "DURATION", `for ${fields.durationWeeks} weeks`, 0.86) : null;

    const remId = (fields.reminderBefore != null)
        ? addEntity("reminder", "REMINDER", `${fields.reminderBefore.n} ${fields.reminderBefore.unit} before`, 0.86) : null;

    const travelId = (fields.travelMin != null)
        ? addEntity("duration", "TRAVEL_TIME", `${fields.travelMin} minutes`, 0.80) : null;

    const conflictId = (fields.conflictRule)
        ? addEntity("conflict", "CONFLICT_RULE",
            `if conflict → move to ${fields.conflictRule.moveToDay || "(day?)"} ${fields.conflictRule.moveToTime || "(time?)"}`, 0.78) : null;

    const attId = (fields.attendees?.length)
        ? addEntity("attendees", "ATTENDEES", fields.attendees.join(", "), 0.78) : null;

    nodes.push({ id: "A", kind: "action", label: "ACTION: create event draft", text: "Draft event + ask for missing details", score: 0.78 });
    [titleId, locId, recurId, timeId, durId, remId, travelId, conflictId, attId].filter(Boolean).forEach(eid => {
        links.push({ source: eid, target: "A", type: "supports", weight: 0.62 });
    });

    const risks = fields.risks || [];
    risks.forEach((r, i) => {
        const rid = `R${i + 1}`;
        nodes.push({ id: rid, kind: "risk", label: `RISK ${i + 1}`, text: r, score: 0.88 });
        links.push({ source: "S", target: rid, type: "supports", weight: 0.35 });
        links.push({ source: rid, target: "A", type: "blocks", weight: 0.72 });
    });

    return { nodes, links, fields };
};
