import type { Location, Uri } from 'vscode';
import type { HoverDisplayItem } from './enum/hoverDisplayItems';

/**
 * Definition of a found word
 */
export interface Word {
  value: string; // The actual string value of the word
  start: number; // The start index of the word (int)
  end: number;   // The end index of the word (int)
  index: number; // The index of this word on its line (int), as in of all the words on a line which index is this word
}

/**
 * The base context for all word matches that always exist, this is built at the start of processing each line
 * and before processing each individual word on that line
 */
export interface BaseContext {
  words: Word[]; // An array of all of the word words in the line of this match
  uri: Uri; // The file uri that this match exists in
  line: { text: string; number: number }; // The line text and number (index) that this match exits on
  file: { name: string; type: string }; // The name and type of the file that this match exists on
}

/**
 * The full match context for a matched word, includes all data from the BaseContext
 */
export interface MatchContext extends BaseContext {
  word: Word; // The specific word that this match is part of
  lineIndex: number; // The index of the line (within the file) that this match is part of
  prevWord: Word | undefined; // The word that comes before the word that this match is part of (undefined if no previous words)
  prevChar: string; // The character that is right before the matched word
  nextChar: string; // The character that is right after the matched word
  modifiedWord?: boolean; // A boolean indicating if this is a modified word (some matches modify the matched word, like cert object cut off the cert_ prefix)
  originalPrefix?: string; // The original prefix text if this is a modified word
  originalSuffix?: string; // The original suffic text if this is a modified word
  cert?: boolean; // A boolean indicating if this match is a cert obj
  packId?: string; // The pack ID for this match if it has one (ex: Obj ID 1234)
}

/**
 * The data used to represent a signature of a proc or other type
 */
export interface Signature {
  params: Array<{ type: string; name: string; matchTypeId: string }>; // The parameters for the signature
  returns: string[]; // The return types for the signature
  paramsText: string; // The precomputed single line text of the parameters
  returnsText: string; // The precomputed single line text of the return types
}

/**
 * The definition of an identifier, identifiers are actual found matches of any matchType in the project files
 * This stores all of the data necessary for the core functions of the extension 
 * (finding references, going to definitions, showing hover display info, etc...)
 */
export interface Identifier {
  name: string; // The name of an identifier 
  matchId?: string; // The matchType ID of the identifier
  id?: string; // This is the pack id (such as Obj ID 1234)
  declaration?: Location; // The location of the declaration/definition of the identifier
  references: Record<string, Set<string>>; // The locations (encoded as string) of the references of the identifier
  fileType: string; // The file type of the identifier
  language: string; // The language of the identifier
  info?: string; // Hover display - info text
  signature?: Signature; // Hover display - signature data
  block?: string; // Hover display - code block text
  value?: string; // Hover display - value text
  extraData?: Record<string, any>; // Any extra (not predefined) data tied to this identifier
  hideDisplay?: boolean; // Boolean indicating if hover text should not display for this identifier
}

/**
 * Function format for post processors which run when an identifier is created
 */
export type PostProcessor = (identifier: Identifier) => void;

/**
 * Text info necessary for creating identifiers
 */
export interface IdentifierText {
  lines: string[];
  start: number;
}

/**
 * The MatchType is the config that controls how identifiers are built, cached, and displayed
 */
export interface MatchType {
  id: string; // Unique identifier for match type. All uppercase and using underscores. (ex: LOC, LOCAL_VAR)
  types: string[]; // The types which can correspond to a matchtype (ex: namedobj, obj are types for the OBJ matchType)
  fileTypes?: string[]; // The file types where a matchType can be defined/declared
  declaration?: boolean; // Boolean value representing 
  cache: boolean; // Whether or not identifiers of this match type should be cached
  referenceOnly?: boolean; // Whether or not identifiers of this type have only references (no definition/declaration). Used mainly for identifiers which refer to a file, like synths.
  allowRename: boolean; // Whether or not identifiers of this type should be allowed to be renamed (code change)
  renameFile?: boolean; // Whether or not identifiers declaration **file name** can be renamed (actual file rename)
  hoverOnly?: boolean; // Whether or not identifiers of this type is for hover display only (not cached)
  noop?: boolean; // Whether or not identifiers of this type is no operation (used for finding matches and terminating matching early, but not ever cached or displayed)
  hoverConfig?: HoverConfig; // The config settings for the hover display of identifiers of this type
  postProcessor?: PostProcessor; // Function that is executed after identifiers of this type have been created (allows for more dynamic runtime info with full context to be tied to an identifier)
  extraData?: Record<string, any>; // A place to store any extra data unique to identifiers of this type (typically used by postProcessors)
}

/**
 * Config which controls how the hover display is built
 */
export interface HoverConfig {
  declarationItems?: HoverDisplayItem[]; // Hover items shown for declarations of a matchType
  referenceItems?: HoverDisplayItem[]; // Hover items shown for references of a matchType
  language?: string; // Language used for displaying code blocks of this matchType (for proper syntax highlighting)
  blockSkipLines?: number; // Number of lines to skip for displaying a code block (defaults to 1 to skip the declaration line that most types have)
  configInclusions?: string[]; // Config line items to include in code block. Undefined shows all config items (default).
}

/**
 * The data returned when a match is found
 */
export interface MatchResult {
  matchType: MatchType; // MatchType of the found result
  word: string; // The word that was matched
  context: MatchContext; // Additional context for the match
}

/**
 * The definition of matchers. Lower priority runs first. Faster processing matchers should be given priority. 
 */
export interface Matcher {
  priority: number;
  fn: (context: any) => MatchType | undefined;
}

/**
 * Response type returned when params are matched
 */
export interface ParamsMatchResponse {
  identifier: Identifier;
  index: number;
  match?: MatchType;
  isReturns?: boolean;
  dynamicCommand?: string;
}

/**
 * The identifier key is the identifier name + matchTypeId. (ex: a proc called do_something -> do_somethingPROC)
 * This supports identifiers with the same name but different match type. 
 */
export type IdentifierKey = string;

/**
 * The file key is simply the URI fsPath
 */
export type FileKey = string;
