from PIL import Image, ImageDraw, ImageFont
import os

def create_route_map():
    # Create a new image with a light blue background
    width, height = 800, 400
    img = Image.new('RGB', (width, height), '#f0f8ff')
    draw = ImageDraw.Draw(img)
    
    # Draw terrain base (green area)
    draw.rectangle([0, 250, 800, 400], fill='#90EE90')
    
    # Draw roads (gray lines)
    draw.rectangle([0, 180, 800, 188], fill='#D3D3D3')
    draw.rectangle([0, 280, 800, 286], fill='#D3D3D3')
    
    # Draw GPS route (green curved line)
    route_points = []
    for x in range(50, 800, 10):
        if x < 200:
            y = 200 - (x - 50) * 0.5
        elif x < 350:
            y = 150 + (x - 200) * 0.2
        elif x < 500:
            y = 180 + (x - 350) * 0.27
        elif x < 650:
            y = 220 - (x - 500) * 0.2
        else:
            y = 190 - (x - 650) * 0.1
        route_points.append((x, int(y)))
    
    # Draw the route line
    for i in range(len(route_points) - 1):
        draw.line([route_points[i], route_points[i + 1]], fill='#4CAF50', width=8)
    
    # Draw start marker
    draw.ellipse([38, 188, 62, 212], fill='#4CAF50')
    
    # Draw end marker
    draw.ellipse([738, 168, 762, 192], fill='#ff4444')
    
    # Draw info panel background
    draw.rectangle([20, 20, 240, 100], fill='white', outline='#333', width=2)
    
    # Try to use a default font, fallback to basic if not available
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        font_text = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except:
        font_title = ImageFont.load_default()
        font_text = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Add text
    draw.text((30, 25), "GPS Route Map", fill='#333', font=font_title)
    draw.text((30, 45), "Distance: 15.3 km", fill='#666', font=font_text)
    draw.text((30, 60), "Elevation: 85m gain", fill='#666', font=font_text)
    draw.text((30, 75), "Duration: 60 minutes", fill='#666', font=font_text)
    
    # Add compass
    draw.ellipse([730, 30, 770, 70], fill='white', outline='#333', width=1)
    draw.polygon([(750, 35), (755, 50), (750, 65), (745, 50)], fill='#4CAF50')
    draw.text((747, 75), "N", fill='#666', font=font_small)
    
    # Add scale
    draw.text((600, 375), "Scale: 1:10000", fill='#666', font=font_small)
    
    # Add start/finish labels
    draw.text((35, 160), "START", fill='#333', font=font_text)
    draw.text((730, 150), "FINISH", fill='#333', font=font_text)
    
    # Save the image
    img.save('uploads/proper_route_map.png', 'PNG', quality=95)
    print("Route map created successfully!")

if __name__ == "__main__":
    create_route_map()