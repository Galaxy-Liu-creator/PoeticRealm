"""B refinement: remove only the night flame from this independent boat component."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=bpy.data.collections['bd_boat_structure'];col.name='bd_boat_day'
history=collection('bd_boat_night_history')
flame=bpy.data.objects['fishfire_flame'];col.objects.unlink(flame);history.objects.link(flame);history.hide_render=True;history.hide_viewport=True
save_component(col,{'removedOnly':'fishfire_flame','hullAndRig':'unchanged','source':'checked bd_boat_structure'},closed=False)
