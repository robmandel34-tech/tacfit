from PIL import Image, ImageDraw, ImageFont
import json
import os

def create_workout_details_page(workout_data):
    """Create a comprehensive workout details page similar to Apple Fitness"""
    # Create a much taller dark-themed image to show everything
    width, height = 400, 1200
    img = Image.new('RGB', (width, height), '#1c1c1e')
    draw = ImageDraw.Draw(img)
    
    # Try to load fonts
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        font_tiny = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
    except:
        font_title = ImageFont.load_default()
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_tiny = ImageFont.load_default()
    
    y_pos = 20
    
    # Header section
    draw.text((20, y_pos), "Sat, Aug 20", fill='#ffffff', font=font_medium)
    y_pos += 40
    
    # Activity icon background (green circle)
    draw.ellipse([20, y_pos, 70, y_pos + 50], fill='#34c759')
    # Activity icon (simplified running figure)
    draw.text((35, y_pos + 15), "🏃", fill='#ffffff', font=font_large)
    
    # Activity title
    draw.text((85, y_pos), workout_data['type'], fill='#ffffff', font=font_title)
    draw.text((85, y_pos + 25), "Open Goal", fill='#34c759', font=font_small)
    y_pos += 70
    
    # Time and location
    time_text = f"{workout_data['start_time']}–{workout_data['end_time']}"
    draw.text((20, y_pos), time_text, fill='#8e8e93', font=font_small)
    y_pos += 25
    draw.text((20, y_pos), "📍 Boulder", fill='#8e8e93', font=font_small)
    y_pos += 50
    
    # Workout Details section
    draw.text((20, y_pos), "Workout Details", fill='#ffffff', font=font_title)
    draw.text((320, y_pos), "Show More", fill='#34c759', font=font_small)
    y_pos += 40
    
    # Metrics grid (2x3)
    metrics = [
        ("Workout Time", workout_data['duration'], '#f39c12'),
        ("Distance", workout_data['distance'], '#3498db'),
        ("Active Calories", f"{workout_data['active_calories']}CAL", '#e74c3c'),
        ("Total Calories", f"{workout_data['total_calories']}CAL", '#e74c3c'),
        ("Elevation Gain", f"{workout_data['elevation']}FT", '#2ecc71'),
        ("Avg. Power", f"{workout_data['avg_power']}W", '#f1c40f')
    ]
    
    for i, (label, value, color) in enumerate(metrics):
        x = 20 + (i % 2) * 180
        y = y_pos + (i // 2) * 60
        
        draw.text((x, y), label, fill='#8e8e93', font=font_tiny)
        draw.text((x, y + 15), value, fill=color, font=font_medium)
    
    y_pos += 200
    
    # Additional metrics
    additional_metrics = [
        ("Avg. Cadence", f"{workout_data['avg_cadence']}SPM", '#3498db'),
        ("Avg. Pace", workout_data['avg_pace'], '#3498db'),
        ("Avg. Heart Rate", f"{workout_data['avg_heart_rate']}BPM", '#e74c3c')
    ]
    
    for i, (label, value, color) in enumerate(additional_metrics):
        x = 20 + (i % 2) * 180
        y = y_pos + (i // 2) * 60
        
        draw.text((x, y), label, fill='#8e8e93', font=font_tiny)
        draw.text((x, y + 15), value, fill=color, font=font_medium)
    
    y_pos += 120
    
    # Splits section
    draw.text((20, y_pos), "Splits", fill='#ffffff', font=font_title)
    draw.text((320, y_pos), "Show More", fill='#34c759', font=font_small)
    y_pos += 30
    
    # Splits header
    draw.text((20, y_pos), "Time", fill='#8e8e93', font=font_tiny)
    draw.text((120, y_pos), "Pace", fill='#8e8e93', font=font_tiny)
    draw.text((220, y_pos), "Heart Rate", fill='#8e8e93', font=font_tiny)
    y_pos += 20
    
    # Sample splits data
    splits_data = [
        ("1", "10:47", "10'47\"", "157BPM", '#e74c3c'),
        ("2", "11:11", "11'11\"", "159BPM", '#e74c3c'),
        ("3", "12:23", "12'23\"", "159BPM", '#e74c3c'),
        ("4", "01:04", "47'50\"", "147BPM", '#e74c3c')
    ]
    
    for split_num, time, pace, hr, color in splits_data:
        draw.text((20, y_pos), split_num, fill='#8e8e93', font=font_tiny)
        draw.text((50, y_pos), time, fill='#3498db', font=font_small)
        draw.text((120, y_pos), pace, fill='#3498db', font=font_small)
        draw.text((220, y_pos), hr, fill=color, font=font_small)
        y_pos += 25
    
    y_pos += 20
    
    # Add GPS route map section
    if workout_data.get('has_route', False):
        # Map section header
        draw.text((20, y_pos), "Route Map", fill='#ffffff', font=font_title)
        y_pos += 30
        
        # Map placeholder/visualization
        draw.rectangle([20, y_pos, 360, y_pos + 120], fill='#2c2c2e', outline='#3a3a3c', width=1)
        
        # Add simple route visualization
        # Start point
        draw.ellipse([30, y_pos + 20, 50, y_pos + 40], fill='#34c759')
        draw.text((55, y_pos + 25), "START", fill='#34c759', font=font_tiny)
        
        # Route line
        route_points = [(60, y_pos + 30), (120, y_pos + 50), (180, y_pos + 40), (240, y_pos + 60), (300, y_pos + 45), (340, y_pos + 35)]
        for i in range(len(route_points) - 1):
            draw.line([route_points[i], route_points[i + 1]], fill='#3498db', width=3)
        
        # End point
        draw.ellipse([330, y_pos + 25, 350, y_pos + 45], fill='#e74c3c')
        draw.text((285, y_pos + 25), "FINISH", fill='#e74c3c', font=font_tiny)
        
        # Map info
        draw.text((30, y_pos + 60), "GPS route recorded", fill='#34c759', font=font_small)
        draw.text((30, y_pos + 80), f"Total distance: {workout_data['distance']}", fill='#8e8e93', font=font_tiny)
        draw.text((30, y_pos + 95), f"Elevation gain: {workout_data['elevation']}ft", fill='#8e8e93', font=font_tiny)
        
        y_pos += 140
    
    # Heart Rate Zones section
    draw.text((20, y_pos), "Heart Rate Zones", fill='#ffffff', font=font_title)
    y_pos += 30
    
    zones = [
        ("Zone 1", "50-60%", "5:23", '#3498db'),
        ("Zone 2", "60-70%", "15:42", '#2ecc71'),
        ("Zone 3", "70-80%", "25:18", '#f39c12'),
        ("Zone 4", "80-90%", "12:37", '#e67e22'),
        ("Zone 5", "90-100%", "1:00", '#e74c3c')
    ]
    
    for zone, percent, time, color in zones:
        draw.text((20, y_pos), zone, fill='#8e8e93', font=font_tiny)
        draw.text((80, y_pos), percent, fill=color, font=font_small)
        draw.text((150, y_pos), time, fill='#ffffff', font=font_small)
        y_pos += 25
    
    y_pos += 20
    
    # Summary section
    draw.text((20, y_pos), "Workout Summary", fill='#ffffff', font=font_title)
    y_pos += 30
    
    summary_items = [
        ("Training Effect", "Improving", '#34c759'),
        ("Recovery Time", "24-48 hours", '#f39c12'),
        ("Calories per Hour", f"{int(int(workout_data['total_calories']) * 60 / int(workout_data['duration'].split(':')[0]))}", '#3498db'),
        ("Weather", "Clear, 72°F", '#8e8e93')
    ]
    
    for label, value, color in summary_items:
        draw.text((20, y_pos), label, fill='#8e8e93', font=font_tiny)
        draw.text((20, y_pos + 15), value, fill=color, font=font_small)
        y_pos += 40
    
    # Footer
    y_pos += 20
    draw.text((20, y_pos), "Synced from Apple Health", fill='#8e8e93', font=font_tiny)
    draw.text((20, y_pos + 15), "TacFit Fitness Platform", fill='#34c759', font=font_tiny)
    
    return img

def generate_workout_details(workout_type="Cycling", duration="60:00", distance="15.3 MI"):
    """Generate workout details based on type"""
    workout_data = {
        'type': f"Outdoor {workout_type}",
        'start_time': "11:00 AM",
        'end_time': "12:00 PM",
        'duration': duration,
        'distance': distance,
        'active_calories': '375',
        'total_calories': '439',
        'elevation': '85',
        'avg_power': '208',
        'avg_cadence': '149',
        'avg_pace': "11'43\"/MI",
        'avg_heart_rate': '158',
        'has_route': True
    }
    
    # Adjust data based on workout type
    if workout_type == "Running":
        workout_data.update({
            'active_calories': '280',
            'total_calories': '320',
            'avg_power': '180',
            'avg_cadence': '165',
            'avg_pace': "8'30\"/MI"
        })
    elif workout_type == "Swimming":
        workout_data.update({
            'active_calories': '180',
            'total_calories': '210',
            'elevation': '0',
            'avg_power': '120',
            'avg_cadence': '45',
            'avg_pace': "2'15\"/100M",
            'has_route': False
        })
    elif workout_type == "Hiking":
        workout_data.update({
            'duration': "90:00",
            'distance': "8.5 MI",
            'active_calories': '450',
            'total_calories': '520',
            'elevation': '120',
            'avg_power': '150',
            'avg_cadence': '120',
            'avg_pace': "15'30\"/MI"
        })
    
    return workout_data

if __name__ == "__main__":
    # Generate different workout types
    workout_types = [
        ("Cycling", "60:00", "15.3 MI"),
        ("Running", "25:00", "3.2 MI"),
        ("Swimming", "30:00", "1.2 MI"),
        ("Hiking", "90:00", "8.5 MI")
    ]
    
    for workout_type, duration, distance in workout_types:
        workout_data = generate_workout_details(workout_type, duration, distance)
        img = create_workout_details_page(workout_data)
        filename = f"uploads/workout_details_{workout_type.lower()}.png"
        img.save(filename, 'PNG', quality=95)
        print(f"Created {filename}")