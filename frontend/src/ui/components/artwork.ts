import home from '../../assets/ui/S01-home-desktop-user.png?url';
import profile from '../../assets/ui/S06-profile-user.png?url';
import login from '../../assets/ui/S11-login-user.png?url';
import register from '../../assets/ui/S12-register-user.png?url';
import accountBackground from '../../assets/ui/auth-split-background-v1.png?url';
import homeBackground from '../../assets/ui/home-background-v1.png?url';
import curtain from '../../assets/ui/curtain-background-v1.png?url';
import fengqiao from '../../assets/ui/S02-fengqiao-cover.jpg?url';
import jiangxue from '../../assets/ui/S03-jiangxue-desktop-asset-1.jpg?url';
import baidicheng from '../../assets/ui/S04-baidicheng-desktop-asset-1.jpg?url';
import landscape from '../../assets/ui/overview-landscape.jpg?url';
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
  accountScene: `background-image:url('${accountBackground}')`,
  accountFeatures: [478, 566, 658, 751].map((y) => crop(login, 1672, 941, [169, y, 77, 76])),
  registerFeatures: [482, 581, 684].map((y) => crop(register, 1672, 941, [188, y, 82, 82])),
  accountBrand: crop(register, 1672, 941, [134, 98, 40, 40]),
  accountIcons: {
    user: crop(login, 1672, 941, [1097, 432, 27, 32]),
    lock: crop(login, 1672, 941, [1100, 563, 24, 30]),
    eye: crop(login, 1672, 941, [1524, 566, 25, 24]),
    calendar: crop(register, 1672, 941, [1067, 662, 23, 24]),
    moon: crop(login, 1672, 941, [1454, 118, 20, 22]),
  },
  curtain,
  curtainLeft: crop(curtain, 1672, 941, [0, 0, 836, 941]),
  curtainRight: crop(curtain, 1672, 941, [836, 0, 836, 941]),
  covers: {
    fengqiao: crop(home, 1536, 1024, [72, 386, 388, 305]),
    jiangxue: crop(home, 1536, 1024, [554, 386, 369, 305]),
    baidicheng: crop(home, 1536, 1024, [1018, 386, 397, 305]),
  } as Record<string, string>,
  scenes: { fengqiao, jiangxue, baidicheng } as Record<string, string>,
};
