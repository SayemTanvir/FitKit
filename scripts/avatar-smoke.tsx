import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import UserAvatar from '../src/components/UserAvatar';
import ReactionBar from '../src/components/ReactionBar';

const fallback=renderToStaticMarkup(<UserAvatar name="Demo Runner" gradient="from-cyan-400 to-emerald-500"/>);
assert.match(fallback,/>DR<\/span>/);
assert.match(fallback,/from-cyan-400 to-emerald-500/);
assert.doesNotMatch(fallback,/<img/);
const reactions=renderToStaticMarkup(<ReactionBar counts={{Fire:2,Flex:1,Clap:0}} active="Flex" onReact={()=>{}}/>);
assert.match(reactions,/Flex reaction, 1 total/);
assert.match(reactions,/aria-pressed="true"/);
console.log('Avatar/reaction rendering smoke passed.');
