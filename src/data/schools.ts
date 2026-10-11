import type { School } from './types';

// Real schools and their student email domains. Names only: Valence is independent and
// uses no school logos, colors or marks. Subdomains (e.g. grad.uconn.edu) match automatically.
// One pilot campus is open; every other school collects a waitlist.
type Row = [id: string, name: string, shortName: string, domains: string, city: string, state: string];

const ROWS: Row[] = [
  // New England
  ['uconn', 'University of Connecticut', 'UConn', 'uconn.edu', 'Storrs', 'CT'],
  ['umass-amherst', 'University of Massachusetts Amherst', 'UMass Amherst', 'umass.edu', 'Amherst', 'MA'],
  ['umass-boston', 'University of Massachusetts Boston', 'UMass Boston', 'umb.edu', 'Boston', 'MA'],
  ['umass-lowell', 'University of Massachusetts Lowell', 'UMass Lowell', 'uml.edu', 'Lowell', 'MA'],
  ['umass-dartmouth', 'University of Massachusetts Dartmouth', 'UMass Dartmouth', 'umassd.edu', 'Dartmouth', 'MA'],
  ['uri', 'University of Rhode Island', 'URI', 'uri.edu', 'Kingston', 'RI'],
  ['uvm', 'University of Vermont', 'UVM', 'uvm.edu', 'Burlington', 'VT'],
  ['unh', 'University of New Hampshire', 'UNH', 'unh.edu', 'Durham', 'NH'],
  ['umaine', 'University of Maine', 'UMaine', 'maine.edu', 'Orono', 'ME'],
  ['yale', 'Yale University', 'Yale', 'yale.edu', 'New Haven', 'CT'],
  ['harvard', 'Harvard University', 'Harvard', 'harvard.edu', 'Cambridge', 'MA'],
  ['mit', 'Massachusetts Institute of Technology', 'MIT', 'mit.edu', 'Cambridge', 'MA'],
  ['brown', 'Brown University', 'Brown', 'brown.edu', 'Providence', 'RI'],
  ['dartmouth', 'Dartmouth College', 'Dartmouth', 'dartmouth.edu', 'Hanover', 'NH'],
  ['bu', 'Boston University', 'BU', 'bu.edu', 'Boston', 'MA'],
  ['bc', 'Boston College', 'BC', 'bc.edu', 'Chestnut Hill', 'MA'],
  ['northeastern', 'Northeastern University', 'Northeastern', 'northeastern.edu', 'Boston', 'MA'],
  ['tufts', 'Tufts University', 'Tufts', 'tufts.edu', 'Medford', 'MA'],
  ['brandeis', 'Brandeis University', 'Brandeis', 'brandeis.edu', 'Waltham', 'MA'],
  ['wpi', 'Worcester Polytechnic Institute', 'WPI', 'wpi.edu', 'Worcester', 'MA'],
  ['holy-cross', 'College of the Holy Cross', 'Holy Cross', 'holycross.edu', 'Worcester', 'MA'],
  ['bentley', 'Bentley University', 'Bentley', 'bentley.edu', 'Waltham', 'MA'],
  ['babson', 'Babson College', 'Babson', 'babson.edu', 'Wellesley', 'MA'],
  ['williams', 'Williams College', 'Williams', 'williams.edu', 'Williamstown', 'MA'],
  ['amherst-college', 'Amherst College', 'Amherst', 'amherst.edu', 'Amherst', 'MA'],
  ['wesleyan', 'Wesleyan University', 'Wesleyan', 'wesleyan.edu', 'Middletown', 'CT'],
  ['trinity-ct', 'Trinity College', 'Trinity', 'trincoll.edu', 'Hartford', 'CT'],
  ['quinnipiac', 'Quinnipiac University', 'Quinnipiac', 'quinnipiac.edu,qu.edu', 'Hamden', 'CT'],
  ['fairfield', 'Fairfield University', 'Fairfield', 'fairfield.edu', 'Fairfield', 'CT'],
  ['sacred-heart', 'Sacred Heart University', 'Sacred Heart', 'sacredheart.edu', 'Fairfield', 'CT'],
  ['uhart', 'University of Hartford', 'UHart', 'hartford.edu', 'West Hartford', 'CT'],
  ['southern-ct', 'Southern Connecticut State University', 'Southern CT', 'southernct.edu', 'New Haven', 'CT'],
  ['ccsu', 'Central Connecticut State University', 'CCSU', 'ccsu.edu', 'New Britain', 'CT'],
  ['providence', 'Providence College', 'Providence', 'providence.edu', 'Providence', 'RI'],
  ['bryant', 'Bryant University', 'Bryant', 'bryant.edu', 'Smithfield', 'RI'],
  ['middlebury', 'Middlebury College', 'Middlebury', 'middlebury.edu', 'Middlebury', 'VT'],
  ['bowdoin', 'Bowdoin College', 'Bowdoin', 'bowdoin.edu', 'Brunswick', 'ME'],
  // Mid-Atlantic
  ['penn-state', 'Pennsylvania State University', 'Penn State', 'psu.edu', 'University Park', 'PA'],
  ['pitt', 'University of Pittsburgh', 'Pitt', 'pitt.edu', 'Pittsburgh', 'PA'],
  ['villanova', 'Villanova University', 'Villanova', 'villanova.edu', 'Villanova', 'PA'],
  ['rutgers', 'Rutgers University', 'Rutgers', 'rutgers.edu', 'New Brunswick', 'NJ'],
  ['syracuse', 'Syracuse University', 'Syracuse', 'syr.edu', 'Syracuse', 'NY'],
  ['stony-brook', 'Stony Brook University', 'Stony Brook', 'stonybrook.edu', 'Stony Brook', 'NY'],
  ['binghamton', 'Binghamton University', 'Binghamton', 'binghamton.edu', 'Binghamton', 'NY'],
  ['buffalo', 'University at Buffalo', 'UB', 'buffalo.edu', 'Buffalo', 'NY'],
  ['delaware', 'University of Delaware', 'Delaware', 'udel.edu', 'Newark', 'DE'],
  ['maryland', 'University of Maryland', 'Maryland', 'umd.edu', 'College Park', 'MD'],
  ['virginia', 'University of Virginia', 'UVA', 'virginia.edu', 'Charlottesville', 'VA'],
  ['virginia-tech', 'Virginia Tech', 'Virginia Tech', 'vt.edu', 'Blacksburg', 'VA'],
  // Southeast
  ['unc', 'University of North Carolina at Chapel Hill', 'UNC', 'unc.edu', 'Chapel Hill', 'NC'],
  ['nc-state', 'North Carolina State University', 'NC State', 'ncsu.edu', 'Raleigh', 'NC'],
  ['clemson', 'Clemson University', 'Clemson', 'clemson.edu', 'Clemson', 'SC'],
  ['georgia', 'University of Georgia', 'UGA', 'uga.edu', 'Athens', 'GA'],
  ['georgia-tech', 'Georgia Institute of Technology', 'Georgia Tech', 'gatech.edu', 'Atlanta', 'GA'],
  ['florida', 'University of Florida', 'UF', 'ufl.edu', 'Gainesville', 'FL'],
  ['florida-state', 'Florida State University', 'FSU', 'fsu.edu', 'Tallahassee', 'FL'],
  ['alabama', 'University of Alabama', 'Alabama', 'ua.edu', 'Tuscaloosa', 'AL'],
  ['auburn', 'Auburn University', 'Auburn', 'auburn.edu', 'Auburn', 'AL'],
  ['tennessee', 'University of Tennessee', 'Tennessee', 'utk.edu', 'Knoxville', 'TN'],
  ['kentucky', 'University of Kentucky', 'Kentucky', 'uky.edu', 'Lexington', 'KY'],
  // Midwest
  ['michigan', 'University of Michigan', 'Michigan', 'umich.edu', 'Ann Arbor', 'MI'],
  ['michigan-state', 'Michigan State University', 'Michigan State', 'msu.edu', 'East Lansing', 'MI'],
  ['ohio-state', 'The Ohio State University', 'Ohio State', 'osu.edu', 'Columbus', 'OH'],
  ['wisconsin', 'University of Wisconsin-Madison', 'Wisconsin', 'wisc.edu', 'Madison', 'WI'],
  ['illinois', 'University of Illinois Urbana-Champaign', 'Illinois', 'illinois.edu', 'Champaign', 'IL'],
  ['indiana', 'Indiana University Bloomington', 'Indiana', 'iu.edu,indiana.edu', 'Bloomington', 'IN'],
  ['purdue', 'Purdue University', 'Purdue', 'purdue.edu', 'West Lafayette', 'IN'],
  ['notre-dame', 'University of Notre Dame', 'Notre Dame', 'nd.edu', 'Notre Dame', 'IN'],
  ['minnesota', 'University of Minnesota', 'Minnesota', 'umn.edu', 'Minneapolis', 'MN'],
  ['iowa', 'University of Iowa', 'Iowa', 'uiowa.edu', 'Iowa City', 'IA'],
  ['missouri', 'University of Missouri', 'Mizzou', 'missouri.edu', 'Columbia', 'MO'],
  ['kansas', 'University of Kansas', 'Kansas', 'ku.edu', 'Lawrence', 'KS'],
  // West and Southwest
  ['texas', 'The University of Texas at Austin', 'UT Austin', 'utexas.edu', 'Austin', 'TX'],
  ['texas-am', 'Texas A&M University', 'Texas A&M', 'tamu.edu', 'College Station', 'TX'],
  ['arizona', 'University of Arizona', 'Arizona', 'arizona.edu', 'Tucson', 'AZ'],
  ['arizona-state', 'Arizona State University', 'ASU', 'asu.edu', 'Tempe', 'AZ'],
  ['colorado', 'University of Colorado Boulder', 'CU Boulder', 'colorado.edu', 'Boulder', 'CO'],
  ['utah', 'University of Utah', 'Utah', 'utah.edu', 'Salt Lake City', 'UT'],
  ['ucla', 'University of California, Los Angeles', 'UCLA', 'ucla.edu', 'Los Angeles', 'CA'],
  ['berkeley', 'University of California, Berkeley', 'Berkeley', 'berkeley.edu', 'Berkeley', 'CA'],
  ['usc', 'University of Southern California', 'USC', 'usc.edu', 'Los Angeles', 'CA'],
  ['washington', 'University of Washington', 'UW', 'uw.edu', 'Seattle', 'WA'],
  ['oregon', 'University of Oregon', 'Oregon', 'uoregon.edu', 'Eugene', 'OR'],
];

export const PILOT_SCHOOL_ID = 'uconn';
export const PILOT_UNLOCK_AT = 50; // students needed before a waitlisted campus opens (placeholder)

export const SCHOOLS: School[] = ROWS.map(([id, name, shortName, domains, city, state]) => ({
  id, name, shortName, emailDomains: domains.split(','), city, state, isPilot: id === PILOT_SCHOOL_ID,
}));

export const SCHOOL_BY_ID: Record<string, School> = Object.fromEntries(SCHOOLS.map(s => [s.id, s]));
