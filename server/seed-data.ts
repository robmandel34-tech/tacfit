import { storage } from "./storage";

// Add sample data for testing
export async function seedDatabase() {
  try {
    // Check if data already exists
    const existingUsers = await storage.getUser(1);
    if (existingUsers) {
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
      description: "8-week intensive fitness competition",
      startDate: new Date("2025-07-01"),
      endDate: new Date("2025-08-31"),
      maxTeams: 10,
      isActive: true,
      createdBy: user1.id,
      requiredActivities: ["cardio", "strength", "flexibility"],
      targetGoals: ["100,000 steps as a team", "50 hours of strength training", "25 hours of flexibility work"]
    });
    
    const comp2 = await storage.createCompetition({
      name: "Winter Warrior Program",
      description: "Cold weather endurance challenge",
      startDate: new Date("2025-12-01"),
      endDate: new Date("2026-02-28"),
      maxTeams: 8,
      isActive: false,
      createdBy: user1.id,
      requiredActivities: ["cardio", "strength", "sports"],
      targetGoals: ["75,000 steps as a team", "40 hours of strength training", "30 hours of sports activities"]
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