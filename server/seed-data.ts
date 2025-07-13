import { storage } from "./storage";

// Add sample data for testing
export async function seedDatabase() {
  try {
    // Check if data already exists
    const existingUsers = await storage.getUsers();
    if (existingUsers && existingUsers.length > 0) {
      console.log("Database already seeded");
      return;
    }

    console.log("Seeding database with sample data...");

    // Create sample users
    const user1 = await storage.createUser({
      username: "Alpha",
      email: "alpha@test.com",
      password: "password123",
      points: 1200
    });
    
    const user2 = await storage.createUser({
      username: "Bravo",
      email: "bravo@test.com", 
      password: "password123",
      points: 800
    });
    
    const user3 = await storage.createUser({
      username: "Charlie",
      email: "charlie@test.com",
      password: "password123",
      points: 950
    });

    // Create sample competitions
    const comp1 = await storage.createCompetition({
      name: "Summer Tactical Challenge",
      description: "3-week intensive fitness competition",
      startDate: new Date("2025-07-01"),
      endDate: new Date("2025-07-21"),
      maxTeams: 10,
      isActive: true,
      createdBy: user1.id,
      requiredActivities: ["cardio", "strength", "flexibility"],
      targetGoals: ["1,500 minutes of cardio", "5,000 reps of strength training", "900 minutes of flexibility work"]
    });
    
    const comp2 = await storage.createCompetition({
      name: "Winter Warrior Program",
      description: "4-week cold weather endurance challenge",
      startDate: new Date("2025-12-01"),
      endDate: new Date("2025-12-28"),
      maxTeams: 8,
      isActive: false,
      createdBy: user1.id,
      requiredActivities: ["cardio", "strength", "flexibility"],
      targetGoals: ["1,200 minutes of cardio", "4,000 reps of strength training", "720 minutes of flexibility work"]
    });

    // Create sample teams
    const team1 = await storage.createTeam({
      name: "Steel Wolves",
      competitionId: comp1.id,
      captainId: user1.id,
      points: 450,
      motto: "Strength Through Unity"
    });
    
    const team2 = await storage.createTeam({
      name: "Iron Eagles",
      competitionId: comp1.id,
      captainId: user2.id,
      points: 320,
      motto: "Soar Higher, Push Harder"
    });

    const team3 = await storage.createTeam({
      name: "Ghost Riders",
      competitionId: comp1.id,
      captainId: user1.id,
      points: 950, // High points to push off screen
      motto: "Beyond the Horizon"
    });

    // Add team members
    await storage.addTeamMember({
      teamId: team1.id,
      userId: user1.id,
      role: "captain"
    });
    
    await storage.addTeamMember({
      teamId: team1.id,
      userId: user3.id,
      role: "member"
    });
    
    await storage.addTeamMember({
      teamId: team2.id,
      userId: user2.id,
      role: "captain"
    });

    // Create sample activities
    await storage.createActivity({
      type: "cardio",
      description: "5-mile tactical run with 40lb pack",
      userId: user1.id,
      teamId: team1.id,
      competitionId: comp1.id,
      points: 85,
      evidenceType: "photo",
      evidenceUrl: "tactical-run-evidence.jpg"
    });
    
    await storage.createActivity({
      type: "strength",
      description: "100 burpees in tactical gear",
      userId: user2.id,
      teamId: team2.id,
      competitionId: comp1.id,
      points: 75,
      evidenceType: "video",
      evidenceUrl: "burpee-challenge.mp4"
    });
    
    await storage.createActivity({
      type: "flexibility",
      description: "30-minute recovery yoga session",
      userId: user3.id,
      teamId: team1.id,
      competitionId: comp1.id,
      points: 45,
      evidenceType: "text",
      evidenceUrl: null
    });

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}