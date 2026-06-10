from sqlalchemy.orm import Session

from app.db.seed import _add_player, clear_all
from app.models import Category, Group, GroupPlayer, GroupTeam, Match, Player, Team
from app.models.enums import CategoryFormat, Gender

# (name, employee_id, gender)
PARTICIPANTS: list[tuple[str, str, Gender]] = [
    ("Raju Reddy", "19024", Gender.MALE),
    ("Medida Teja", "24425", Gender.MALE),
    ("Chakravarthi", "25926", Gender.MALE),
    ("Surya Borusu", "28548", Gender.MALE),
    ("Pavan Posannapeta", "29143", Gender.MALE),
    ("Pavan Andhukuri", "30916", Gender.MALE),
    ("Srikanth Nelluri", "31133", Gender.MALE),
    ("K Raghavendra", "31649", Gender.MALE),
    ("Sree Lekha", "33566", Gender.FEMALE),
    ("Bharath Balla", "35810", Gender.MALE),
    ("Vivek Alladi", "38312", Gender.MALE),
    ("Amrutha M", "38302", Gender.FEMALE),
    ("Anusha Palle", "39130", Gender.FEMALE),
    ("Mani Kumar Reddy Kancharla", "39592", Gender.MALE),
    ("Lakshmi Prasanna", "40885", Gender.FEMALE),
    ("SVS Maruthi", "41018", Gender.MALE),
    ("Akhil Charugondla", "41213", Gender.MALE),
    ("Yamuna Kadava", "41443", Gender.FEMALE),
    ("Gopichand G", "42190", Gender.MALE),
    ("Eshwar Baddam", "42193", Gender.MALE),
    ("Jaya Simha Reddy Nandyala", "42390", Gender.MALE),
    ("Sai Srinivas Marem", "42543", Gender.MALE),
    ("Prateek Gupta", "42558", Gender.MALE),
    ("Sudhir Batham", "42728", Gender.MALE),
    ("Pulkit Kumar", "42746", Gender.MALE),
    ("Maheshkumar Boga", "42906", Gender.MALE),
    ("Hemanth Sri Sai Boodi", "43290", Gender.MALE),
    ("Narendra Simha Mekala", "43310", Gender.MALE),
    ("Sasidhar Challa", "43702", Gender.MALE),
    ("Krishna Teja", "43858", Gender.MALE),
    ("Divakar Rayapudi", "43871", Gender.MALE),
    ("Sita Sowmya Paluri", "43876", Gender.FEMALE),
    ("Janardhan P", "43883", Gender.MALE),
    ("Rohan Mogadampally", "44026", Gender.MALE),
    ("Sagar Babu", "44220", Gender.MALE),
    ("Ashay Kumar", "44290", Gender.MALE),
    ("Huzaifa", "44320", Gender.MALE),
    ("Naveen Gudla", "44480", Gender.MALE),
    ("Rasmith Patnaik Arasada", "44501", Gender.MALE),
    ("Gadikoya Chandra Reddy", "44526", Gender.MALE),
    ("Mohd Aquib Shakeel", "44528", Gender.MALE),
    ("Chandrasekhar Raju", "44854", Gender.MALE),
    ("Sai Akhil Allam", "44963", Gender.MALE),
    ("Bolem Poorna Rama Satya Chandu", "45062", Gender.MALE),
    ("Sharan Reddi", "45142", Gender.MALE),
    ("Lochan Sindunoori", "45246", Gender.MALE),
    ("Ravi Kiran Yasa", "45274", Gender.MALE),
    ("Praneeth Andukuri", "45389", Gender.MALE),
    ("Rohini Priyamvada K", "45390", Gender.FEMALE),
    ("Batta Malleswari", "45400", Gender.FEMALE),
    ("Prashanth Charla", "45845", Gender.MALE),
    ("Chaitanya Kumar", "45938", Gender.MALE),
    ("Bhargav Potnuri", "45988", Gender.MALE),
    ("Varun Manireddy", "46235", Gender.MALE),
    ("Shiva Chaudhari", "46774", Gender.MALE),
    ("Vishnu M", "46805", Gender.MALE),
    ("Sai Mohan Reddy", "46882", Gender.MALE),
    ("Supriya Karindi", "47492", Gender.FEMALE),
    ("Suresh Kolla", "48370", Gender.MALE),
    ("Dinesh Jampani", "48384", Gender.MALE),
    ("Swetha SS", "48474", Gender.FEMALE),
    ("Nagendra Babu Marasu", "42490", Gender.MALE),
    ("Garlapati Praveen", "44606", Gender.MALE),
]

# Men's Singles — group name -> player employee IDs (in seed order)
MENS_SINGLES_GROUPS: dict[str, list[str]] = {
    "Group A": ["29143", "42728", "35810", "46235", "43883", "43871", "43290"],
    "Group B": ["46882", "19024", "31649", "48384", "42193", "45062", "45274"],
    "Group C": ["44480", "24425", "45845", "43702", "44526", "44320", "42490"],
    "Group D": ["44963", "28548", "44290", "42190", "42558", "39592", "44854"],
    "Group E": ["45988", "43310", "45938", "45389", "48370", "45142", "42390"],
    "Group F": ["44606", "44501", "42746", "45246", "41018", "42543"],
    "Group G": ["44026", "25926", "31133", "41213", "44528", "44220"],
    "Group H": ["42906", "30916", "46805", "43858", "38312", "46774"],
}

# Women's Singles
WOMENS_SINGLES_GROUPS: dict[str, list[str]] = {
    "Group W-A": ["33566", "38302", "39130", "47492", "48474"],
    "Group W-B": ["40885", "41443", "43876", "45390", "45400"],
}


def seed_tournament(db: Session) -> dict[str, int]:
    categories = {
        "ms": Category(
            name="Men's Singles", gender=Gender.MALE, format=CategoryFormat.SINGLES
        ),
        "ws": Category(
            name="Women's Singles", gender=Gender.FEMALE, format=CategoryFormat.SINGLES
        ),
        "md": Category(
            name="Men's Doubles", gender=Gender.MALE, format=CategoryFormat.DOUBLES
        ),
        "xd": Category(
            name="Mixed Doubles", gender=Gender.MIXED, format=CategoryFormat.DOUBLES
        ),
    }
    db.add_all(categories.values())
    db.flush()

    players_by_emp_id: dict[str, Player] = {}
    for name, employee_id, gender in PARTICIPANTS:
        player = Player(name=name, employee_id=employee_id, gender=gender)
        db.add(player)
        players_by_emp_id[employee_id] = player
    db.flush()

    groups: list[Group] = []
    for group_name in MENS_SINGLES_GROUPS:
        group = Group(category_id=categories["ms"].id, name=group_name)
        db.add(group)
        groups.append(group)
    for group_name in WOMENS_SINGLES_GROUPS:
        group = Group(category_id=categories["ws"].id, name=group_name)
        db.add(group)
        groups.append(group)
    db.flush()

    for group_name, employee_ids in MENS_SINGLES_GROUPS.items():
        group = next(g for g in groups if g.name == group_name)
        for position, emp_id in enumerate(employee_ids, start=1):
            _add_player(db, group, players_by_emp_id[emp_id].id, position)

    for group_name, employee_ids in WOMENS_SINGLES_GROUPS.items():
        group = next(g for g in groups if g.name == group_name)
        for position, emp_id in enumerate(employee_ids, start=1):
            _add_player(db, group, players_by_emp_id[emp_id].id, position)

    db.commit()

    return {
        "categories": db.query(Category).count(),
        "groups": db.query(Group).count(),
        "players": db.query(Player).count(),
        "teams": db.query(Team).count(),
        "group_players": db.query(GroupPlayer).count(),
        "group_teams": db.query(GroupTeam).count(),
        "matches": db.query(Match).count(),
    }


__all__ = ["clear_all", "seed_tournament"]
