import enum


class Gender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    MIXED = "MIXED"


class CategoryFormat(str, enum.Enum):
    SINGLES = "SINGLES"
    DOUBLES = "DOUBLES"


class ParticipantType(str, enum.Enum):
    PLAYER = "PLAYER"
    TEAM = "TEAM"


class MatchStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    COMPLETED = "COMPLETED"
