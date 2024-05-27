Yakit translated to English (with absolutely no mercy).

Yak is a seriously cool concept (https://github.com/yaklang/yaklang), it's a DSL/scripting language designed for (offensive) security and along with a serious arsenal of an stdlib already solidly in place, it's actually usable and _portable_ in ways things like NSE/MSF won't ever be. I could say nice things about Yak all day, go through the code yourself and look at the treasure trove of tidy, loosely coupled libs. It's impressive already and yet the project still feels basically unknown outside of the devs and a few interested spectators.

Yakit is a part GUI part ICBM and 100% Chinese. The idea seems to want to be all security tools at once with the bulk of the functionality being implemented in Yak. Very cool. I've used https://github.com/ip-rw/translate_code/ to translate it. It compiles and doesn't immediately explode at runtime, beyond that everything's a bonus. This readme probably took longer than the translation and few repairs so it's not all bad. 

Theres an AppImage and an exe (untested) in the releases (assuming github will accept files 100mb+)

Roughly speaking the build involves:
- yarn install-render
- yarn build-render
- yarn install
- yarn pack-linux (or -win, or whatever, who knows might work)

Yak is awesome guys, Thank you for keeping it free.
