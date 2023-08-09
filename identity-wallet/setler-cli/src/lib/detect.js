// eslint-disable-next-line prefer-regex-literals
export const possibleAccountAddress = new RegExp(
  // h/t: https://github.com/XRPL-Labs/XUMM-App/blob/7fdf68c49df58c4b7b9466c6e16293b749314fc2/src/screens/Send/Steps/Recipient/RecipientStep.tsx#LL259C13-L264C59
  /^[rX][rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]{23,50}/
);

// eslint-disable-next-line prefer-regex-literals
export const possibleDid = new RegExp(/^did:/i);

// subjects have the form SOME_TYPE:SOME_VALUE
// eslint-disable-next-line prefer-regex-literals
export const possibleSubject = new RegExp(/.*:.*/);

export const detectStringTypes = (string) => {
  const matches = {};
  matches.accountAddress = possibleAccountAddress.test(string);
  matches.did = possibleDid.test(string);
  matches.subject = possibleSubject.test(string);
  matches.unknown = !matches.accountAddress && !matches.did && !matches.subject;

  return matches;
};
