#!/bin/bash

PROJPATH=$HOME/projects
SRCPATH=$PROJPATH/plotqi/build
PKGPATH=$PROJPATH/upiq5/app/src/uu.chart
DESTPATH=$PKGPATH/uu/chart/browser/resources/plotqi

# copy assets from plotqi build to uu.chart resource directory:

cp $SRCPATH/plotqi.*s* $DESTPATH

# open a new iTerm2 window in
osascript <<EOF
    tell application "iTerm2"
        activate
        tell current session of current window
            set newsession1 to (split vertically with default profile)
            select newsession1
        end tell
        tell current session of current window
            write text "cd $DESTPATH"
            write text "git status"
        end tell
    end tell
EOF
