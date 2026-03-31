[**zget-cli**](../README.md)

***

[zget-cli](../README.md) / cliFlags

# Variable: cliFlags

> `const` **cliFlags**: `object`

Defined in: [cli-metadata.ts:3](https://github.com/AstroAir/react-cli-quick-starter/blob/main/source/cli-metadata.ts#L3)

## Type Declaration

### content

> **content**: `object`

#### content.default

> **default**: `string` = `''`

#### content.description

> **description**: `string` = `'Content body for XHS publish'`

#### content.type

> **type**: `"string"`

### cookies

> **cookies**: `object`

#### cookies.default

> **default**: `string` = `''`

#### cookies.description

> **description**: `string` = `'Cookie string (overrides saved cookies)'`

#### cookies.type

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

### resume

> **resume**: `object`

#### resume.default

> **default**: `boolean` = `true`

#### resume.description

> **description**: `string` = `'Resume interrupted batch downloads'`

#### resume.type

> **type**: `"boolean"`

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
