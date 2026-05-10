[**zget-cli**](../README.md)

***

[zget-cli](../README.md) / cliFlags

# Variable: cliFlags

> `const` **cliFlags**: `object`

Defined in: [cli-metadata.ts:3](https://github.com/AstroAir/react-cli-quick-starter/blob/main/source/cli-metadata.ts#L3)

## Type Declaration

### comments

> **comments**: `object`

#### comments.default

> **default**: `boolean` = `false`

#### comments.description

> **description**: `string` = `'Include comments in answer view'`

#### comments.type

> **type**: `"boolean"`

### content

> **content**: `object`

#### content.default

> **default**: `string` = `''`

#### content.description

> **description**: `string` = `'Content body for XHS publish'`

#### content.type

> **type**: `"string"`

### cookie

> **cookie**: `object`

#### cookie.default

> **default**: `string` = `''`

#### cookie.description

> **description**: `string` = `'Cookie string for "zhihu login --cookie" (alias of --cookies, single platform)'`

#### cookie.type

> **type**: `"string"`

### cookies

> **cookies**: `object`

#### cookies.default

> **default**: `string` = `''`

#### cookies.description

> **description**: `string` = `'Cookie string (overrides saved cookies)'`

#### cookies.type

> **type**: `"string"`

### detail

> **detail**: `object`

#### detail.default

> **default**: `string` = `''`

#### detail.description

> **description**: `string` = `'Detail body for "zhihu ask" (HTML allowed)'`

#### detail.shortFlag

> **shortFlag**: `string` = `'d'`

#### detail.type

> **type**: `"string"`

### format

> **format**: `object`

#### format.default

> **default**: `string` = `'human'`

#### format.description

> **description**: `string` = `'Output format: human or json'`

#### format.shortFlag

> **shortFlag**: `string` = `'f'`

#### format.type

> **type**: `"string"`

### image

> **image**: `object`

#### image.default

> **default**: `string` = `''`

#### image.description

> **description**: `string` = `'Image path for XHS publish (can repeat)'`

#### image.isMultiple

> **isMultiple**: `boolean` = `true`

#### image.type

> **type**: `"string"`

### images

> **images**: `object`

#### images.default

> **default**: `boolean` = `true`

#### images.description

> **description**: `string` = `'Download images locally'`

#### images.type

> **type**: `"boolean"`

### limit

> **limit**: `object`

#### limit.default

> **default**: `number` = `10`

#### limit.description

> **description**: `string` = `'Limit results for browse commands'`

#### limit.shortFlag

> **shortFlag**: `string` = `'l'`

#### limit.type

> **type**: `"number"`

### neutral

> **neutral**: `object`

#### neutral.default

> **default**: `boolean` = `false`

#### neutral.description

> **description**: `string` = `'Cancel vote (used with "zhihu vote")'`

#### neutral.type

> **type**: `"boolean"`

### offset

> **offset**: `object`

#### offset.default

> **default**: `number` = `0`

#### offset.description

> **description**: `string` = `'Offset for paginated browse commands'`

#### offset.type

> **type**: `"number"`

### output

> **output**: `object`

#### output.default

> **default**: `string` = `'./downloads'`

#### output.description

> **description**: `string` = `'Output directory'`

#### output.shortFlag

> **shortFlag**: `string` = `'o'`

#### output.type

> **type**: `"string"`

### questions

> **questions**: `object`

#### questions.default

> **default**: `boolean` = `false`

#### questions.description

> **description**: `string` = `'Include top questions in topic view'`

#### questions.type

> **type**: `"boolean"`

### reply

> **reply**: `object`

#### reply.default

> **default**: `string` = `''`

#### reply.description

> **description**: `string` = `'Reply to a comment ID (used with "zhihu comment")'`

#### reply.type

> **type**: `"string"`

### resume

> **resume**: `object`

#### resume.default

> **default**: `boolean` = `true`

#### resume.description

> **description**: `string` = `'Resume interrupted batch downloads'`

#### resume.type

> **type**: `"boolean"`

### sort

> **sort**: `object`

#### sort.default

> **default**: `string` = `''`

#### sort.description

> **description**: `string` = `'Sort key: user-answers {default|voteups|created|updated}'`

#### sort.type

> **type**: `"string"`

### text

> **text**: `object`

#### text.default

> **default**: `string` = `''`

#### text.description

> **description**: `string` = `'Text content for post/reply/comment'`

#### text.shortFlag

> **shortFlag**: `string` = `'t'`

#### text.type

> **type**: `"string"`

### topic

> **topic**: `object`

#### topic.default

> **default**: `string` = `''`

#### topic.description

> **description**: `string` = `'Topic ID for "zhihu ask"/"zhihu publish-article" (repeatable)'`

#### topic.isMultiple

> **isMultiple**: `boolean` = `true`

#### topic.type

> **type**: `"string"`

### type

> **type**: `object`

#### type.default

> **default**: `string` = `''`

#### type.description

> **description**: `string` = `'Filter type: search {general|topic|people}'`

#### type.type

> **type**: `"string"`

### unfollow

> **unfollow**: `object`

#### unfollow.default

> **default**: `boolean` = `false`

#### unfollow.description

> **description**: `string` = `'Unfollow instead of follow (used with "zhihu follow")'`

#### unfollow.type

> **type**: `"boolean"`

### verbose

> **verbose**: `object`

#### verbose.default

> **default**: `boolean` = `false`

#### verbose.description

> **description**: `string` = `'Verbose output'`

#### verbose.shortFlag

> **shortFlag**: `string` = `'v'`

#### verbose.type

> **type**: `"boolean"`

### yes

> **yes**: `object`

#### yes.default

> **default**: `boolean` = `false`

#### yes.description

> **description**: `string` = `'Skip confirmation for destructive actions'`

#### yes.shortFlag

> **shortFlag**: `string` = `'y'`

#### yes.type

> **type**: `"boolean"`
