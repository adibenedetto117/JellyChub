export interface LiveTvChannel {
  Id: string;
  Name: string;
  Number?: string;
  ChannelNumber?: string;
  Type: 'TvChannel';
  CurrentProgram?: LiveTvProgram;
  ImageTags?: Record<string, string>;
  PrimaryImageTag?: string;
  ServerId: string;
  ChannelType?: 'TV' | 'Radio';
  UserData?: {
    IsFavorite: boolean;
  };
}

export interface LiveTvProgram {
  Id: string;
  ChannelId: string;
  Name: string;
  Overview?: string;
  StartDate: string;
  EndDate: string;
  Type: 'Program';
  ImageTags?: Record<string, string>;
  SeriesId?: string;
  EpisodeTitle?: string;
  IsMovie?: boolean;
  IsSeries?: boolean;
  IsNews?: boolean;
  IsSports?: boolean;
  IsKids?: boolean;
  ProductionYear?: number;
  OfficialRating?: string;
  CommunityRating?: number;
  ServerId: string;
  HasPrimaryImage?: boolean;
  PrimaryImageAspectRatio?: number;
  Genres?: string[];
}

export interface ChannelGroup {
  id: string;
  name: string;
  channels: LiveTvChannel[];
}

export interface GuideInfo {
  StartDate: string;
  EndDate: string;
}

export interface LiveTvInfo {
  Services: LiveTvServiceInfo[];
  IsEnabled: boolean;
  EnabledUsers: string[];
}

export interface LiveTvServiceInfo {
  Name: string;
  HomePageUrl?: string;
  Status: 'Ok' | 'Unavailable';
  StatusMessage?: string;
  Version?: string;
  HasUpdateAvailable: boolean;
  IsVisible: boolean;
  Tuners?: string[];
}

export interface ChannelsResponse {
  Items: LiveTvChannel[];
  TotalRecordCount: number;
  StartIndex: number;
}

export interface ProgramsResponse {
  Items: LiveTvProgram[];
  TotalRecordCount: number;
  StartIndex: number;
}

export interface RecordingInfo {
  Id: string;
  ChannelId: string;
  ChannelName?: string;
  Name: string;
  Overview?: string;
  StartDate: string;
  EndDate: string;
  Status: 'New' | 'InProgress' | 'Completed' | 'Cancelled' | 'ConflictedOk' | 'ConflictedNotOk' | 'Error';
  ProgramId?: string;
  ImageTags?: Record<string, string>;
}

export interface TimerInfo {
  Id: string;
  Type: string;
  ServerId: string;
  ChannelId: string;
  ChannelName?: string;
  ProgramId?: string;
  Name: string;
  Overview?: string;
  StartDate: string;
  EndDate: string;
  Status: 'New' | 'InProgress' | 'Cancelled' | 'Completed' | 'Deleted' | 'Error';
  Priority: number;
  PrePaddingSeconds: number;
  PostPaddingSeconds: number;
  IsPrePaddingRequired: boolean;
  IsPostPaddingRequired: boolean;
}

export type EPGTimeSlot = {
  time: Date;
  label: string;
};

export interface EPGRow {
  channel: LiveTvChannel;
  programs: LiveTvProgram[];
}
