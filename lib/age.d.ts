declare const age: {
  ageFromParts(year: number, month: number, day: number): number;
  ageFromBirth(birth?: string): number | undefined;
};
export = age;
