// WordIdol roster — EXAMPLE with fake labels and PINs (safe for the public repo).
// The real file is apps-script/Roster.gs: same shape, real labels and PINs, kept ONLY in the
// Apps Script project and git-ignored. Never commit Roster.gs. Ids are fixed (SPEC §1.2).
var ROSTER = [
  { id: 's01', label: 'Student A', pin: '0001', guest: false },
  { id: 's02', label: 'Student B', pin: '0002', guest: false },
  { id: 's03', label: 'Student C', pin: '0003', guest: false },
  { id: 's04', label: 'Student D', pin: '0004', guest: false },
  { id: 's05', label: 'Student E', pin: '0005', guest: false },
  { id: 's06', label: 'Student F', pin: '0006', guest: false },
  { id: 's07', label: 'Student G', pin: '0007', guest: false },
  { id: 's08', label: 'Student H', pin: '0008', guest: false },
  { id: 'g1', label: 'Guest#1', pin: '1111', guest: true },
  { id: 'g2', label: 'Guest#2', pin: '2222', guest: true },
  { id: 'g3', label: 'Guest#3', pin: '3333', guest: true }
];
var TEACHER_PIN = '123456';
var PIN_SALT = 'example-salt-change-me';
var EVIDENCE_FOLDER_ID = '';
