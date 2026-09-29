def classify_issue(title: str, description: str):
    text = f"{title} {description}".lower()

    category = "General"
    priority = "Low"

    if any(word in text for word in ["streetlight", "light", "dark", "unsafe"]):
        category = "Public Safety"

    elif any(word in text for word in ["crosswalk", "intersection", "traffic", "car", "road safety"]):
        category = "Road Safety"

    elif any(word in text for word in ["wheelchair", "accessible", "accessibility", "ramp"]):
        category = "Accessibility"

    elif any(word in text for word in ["pothole", "sidewalk", "road damage", "damaged road"]):
        category = "Infrastructure"

    elif any(word in text for word in ["trash", "garbage", "litter", "waste"]):
        category = "Sanitation"

    if any(word in text for word in ["dangerous", "unsafe", "injury", "crash", "blocked"]):
        priority = "High"

    elif any(word in text for word in ["broken", "damaged", "difficult", "large"]):
        priority = "Medium"

    return {
        "category": category,
        "priority": priority,
    }