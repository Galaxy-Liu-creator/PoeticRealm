import home from '../../../docs/design/2026-10-01-v3/v09/screens/S01-home-desktop-user.png?url';
import profile from '../../../docs/design/2026-10-01-v3/v07/references/S06-profile-user.png?url';
import login from '../../../docs/design/2026-10-01-v3/v07/references/S11-login-user.png?url';
import register from '../../../docs/design/2026-10-01-v3/v07/references/S12-register-user.png?url';
import accountLandscape from '../../../docs/design/2026-10-01-v3/runtime-assets/account-landscape-v1.png?url';
import accountPaper from '../../../docs/design/2026-10-01-v3/runtime-assets/account-paper-v1.png?url';
import homeBackground from '../../../docs/design/2026-10-01-v3/runtime-assets/home-background-v1.png?url';
import curtain from '../../../docs/design/2026-10-01-v3/v07/references/S13-curtain-entry-user.png?url';
import fengqiao from '../../../docs/design/2026-10-01-v3/v03/assets/S02-fengqiao-cover.jpg?url';
import jiangxue from '../../../docs/design/2026-10-01-v3/v03/assets/S03-jiangxue-desktop-asset-1.jpg?url';
import baidicheng from '../../../docs/design/2026-10-01-v3/v03/assets/S04-baidicheng-desktop-asset-1.jpg?url';
import landscape from '../../../docs/design/2026-10-01-v3/v02/assets/overview-landscape.jpg?url';
type Crop = [number, number, number, number];
function crop(url: string, width: number, height: number, [x, y, w, h]: Crop): string {
  return `background-image:url('${url}');background-size:${width / w * 100}% ${height / h * 100}%;background-position:${x / (width - w || 1) * 100}% ${y / (height - h || 1) * 100}%`;
}
// Artwork regions are cropped in CSS; all text and controls remain DOM.
export const artwork = {
  hero: crop(homeBackground, 1536, 1024, [0, 0, 1536, 295]),
  homePaper: crop(homeBackground, 1536, 1024, [0, 295, 1536, 729]),
  paper: landscape,
  profileHero: crop(profile, 1448, 1086, [450, 75, 998, 180]),
  avatar: crop(profile, 1448, 1086, [156, 323, 144, 144]),
  accountScene: `background-image:url('${accountLandscape}')`,
  accountPaper: `background-image:url('${accountPaper}');background-size:135% 135%;background-position:center`,
  accountFeatures: [420, 520, 621, 724].map((y) => crop(login, 1672, 941, [332, y, 82, 83])),
  accountIcons: {
    user: crop(login, 1672, 941, [1058, 462, 28, 28]),
    lock: crop(login, 1672, 941, [1058, 572, 26, 26]),
    eye: crop(login, 1672, 941, [1447, 573, 28, 26]),
    calendar: crop(register, 1672, 941, [1048, 600, 26, 26]),
  },
  accountCorners: [[980, 176, 38, 39], [1505, 175, 38, 39], [980, 817, 38, 39], [1505, 817, 38, 39]].map((region) => crop(login, 1672, 941, region as Crop)),
  curtain,
  curtainLeft: crop(curtain, 1672, 941, [0, 0, 480, 941]),
  curtainRight: crop(curtain, 1672, 941, [1192, 0, 480, 941]),
  covers: {
    fengqiao: crop(home, 1536, 1024, [72, 386, 388, 305]),
    jiangxue: crop(home, 1536, 1024, [554, 386, 369, 305]),
    baidicheng: crop(home, 1536, 1024, [1018, 386, 397, 305]),
  } as Record<string, string>,
  scenes: { fengqiao, jiangxue, baidicheng } as Record<string, string>,
};
