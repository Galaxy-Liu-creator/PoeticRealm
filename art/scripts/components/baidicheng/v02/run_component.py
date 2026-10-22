"""Run one component in its isolated Blender process and close audio-free on exit."""
from pathlib import Path
import sys,os,runpy,traceback
args=sys.argv[sys.argv.index('--')+1:]
assert args and all(c.isalnum() or c=='_' for c in args[0])
script=Path(__file__).resolve().parent/(args[0]+'.py')
sys.argv=sys.argv[:sys.argv.index('--')]+['--']+args[1:]
code=0
try:runpy.run_path(str(script),run_name='__main__')
except BaseException:traceback.print_exc();code=1
sys.stdout.flush();sys.stderr.flush();os._exit(code)
